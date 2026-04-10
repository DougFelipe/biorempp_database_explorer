import { createGuidedCatalogLoader } from './catalog-loader.mjs';
import {
  formatEndpoint,
  getEndpointGroupKey,
  getEndpointGroupTitle,
  getEndpointSortTuple,
} from './toxicity-groups.mjs';

const DATASET_FILTER_WHITELIST = {
  compound_summary: new Set([
    'search',
    'pathway',
    'source',
    'compoundclass',
    'reference_ag',
    'ko_count',
    'compound_count',
    'gene_count',
    'pathway_count',
    'risk_mode',
    'endpoint_group',
    'endpoint',
    'x_scale',
    'y_value',
    'focus_cluster',
  ]),
};

const EXECUTOR_REGISTRY = {
  uc_ranked_metric: executeRankedMetric,
  uc_most_toxic_compounds: executeMostToxicCompounds,
  uc_regulated_by_agency: executeRegulatedByAgency,
  uc_pathway_functional_coverage: executePathwayFunctionalCoverage,
  uc_risk_potential_scatter: executeRiskPotentialScatter,
};

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseMaybeNumber(value) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
  }
  return false;
}

function parseRangeValue(rawValue) {
  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
    return {};
  }
  const min = parseMaybeNumber(rawValue.min);
  const max = parseMaybeNumber(rawValue.max);
  return {
    min,
    max,
  };
}

function safeLikeValue(value) {
  return `%${String(value)}%`;
}

function readDistinctStrings(db, sql, params = []) {
  return db
    .prepare(sql)
    .all(...params)
    .map((row) => row.value)
    .filter((value) => value !== null && value !== undefined && String(value).trim() !== '');
}

function percentile(values, p) {
  if (!Array.isArray(values) || values.length === 0) {
    return undefined;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

function deriveRiskBucket(label) {
  const normalized = String(label || '')
    .toLowerCase()
    .trim();
  if (!normalized) {
    return 'unknown';
  }
  if (normalized.includes('high toxicity') || normalized.includes('low safety')) {
    return 'high_risk';
  }
  if (normalized.includes('medium toxicity') || normalized.includes('medium safety')) {
    return 'medium_risk';
  }
  if (normalized.includes('low toxicity') || normalized.includes('high safety')) {
    return 'low_risk';
  }
  return 'unknown';
}

function quadrantFor(point, xThreshold, yThreshold) {
  const highPotential = point.gene_count >= xThreshold;
  const highRisk = point.y_value >= yThreshold;
  if (highPotential && highRisk) {
    return 'top_right';
  }
  if (!highPotential && highRisk) {
    return 'top_left';
  }
  if (highPotential && !highRisk) {
    return 'bottom_right';
  }
  return 'bottom_left';
}

function resolveMetaEndpointOptions(db, endpoint) {
  switch (endpoint) {
    case '/api/meta/compound-classes':
      return readDistinctStrings(
        db,
        `
          SELECT DISTINCT compoundclass AS value
          FROM compound_summary
          WHERE compoundclass IS NOT NULL
          ORDER BY compoundclass
        `
      ).map((value) => ({ value, label: value }));
    case '/api/meta/reference-ags':
      return readDistinctStrings(
        db,
        `
          SELECT DISTINCT reference_ag AS value
          FROM compound_reference_map
          WHERE reference_ag IS NOT NULL
          ORDER BY reference_ag
        `
      ).map((value) => ({ value, label: value }));
    case '/api/meta/pathways':
      return readDistinctStrings(
        db,
        `
          SELECT DISTINCT pathway AS value
          FROM pathway_summary
          WHERE pathway IS NOT NULL
          ORDER BY pathway
        `
      ).map((value) => ({ value, label: value }));
    case '/api/meta/genes':
      return readDistinctStrings(
        db,
        `
          SELECT DISTINCT genesymbol AS value
          FROM gene_summary
          WHERE genesymbol IS NOT NULL
          ORDER BY genesymbol
        `
      ).map((value) => ({ value, label: value }));
    default:
      throw new Error(`Unsupported guided meta_endpoint provider: ${endpoint}`);
  }
}

function resolveQueryDerivedOptions(db, provider, selectedFilters = {}) {
  if (provider.source !== 'toxicity_endpoints') {
    throw new Error(`Unsupported guided query_derived provider source: ${provider.source}`);
  }

  const endpointGroup = typeof selectedFilters.endpoint_group === 'string' ? selectedFilters.endpoint_group : 'all';

  let options = readDistinctStrings(
    db,
    `
      SELECT DISTINCT endpoint AS value
      FROM toxicity_endpoint
      WHERE endpoint IS NOT NULL
      ORDER BY endpoint
    `
  )
    .map((endpoint) => ({
      value: endpoint,
      label: formatEndpoint(endpoint),
      group_key: getEndpointGroupKey(endpoint),
      group_title: getEndpointGroupTitle(getEndpointGroupKey(endpoint)),
    }))
    .sort((a, b) => {
      const [groupA, endpointA, labelA] = getEndpointSortTuple(a.value);
      const [groupB, endpointB, labelB] = getEndpointSortTuple(b.value);
      if (groupA !== groupB) {
        return groupA - groupB;
      }
      if (endpointA !== endpointB) {
        return endpointA - endpointB;
      }
      return labelA.localeCompare(labelB);
    });

  if (endpointGroup && endpointGroup !== 'all') {
    options = options.filter((option) => option.group_key === endpointGroup);
  }

  if (provider.include_mean_option && (!endpointGroup || endpointGroup === 'all')) {
    options = [
      {
        value: 'mean',
        label: provider.mean_option_label || 'toxicity_risk_mean (all endpoints mean)',
      },
      ...options,
    ];
  }

  return options;
}

function normalizeFilters(query, rawFilters = {}) {
  const normalized = {};
  const allowedFilterIds = DATASET_FILTER_WHITELIST[query.dataset];
  if (!allowedFilterIds) {
    throw new Error(`No filter whitelist configured for dataset "${query.dataset}"`);
  }

  for (const [filterId] of Object.entries(rawFilters || {})) {
    if (!query.filters.some((filter) => filter.id === filterId)) {
      throw new Error(`Unknown filter "${filterId}" for query "${query.id}"`);
    }
  }

  for (const filter of query.filters || []) {
    if (!allowedFilterIds.has(filter.id)) {
      throw new Error(
        `Filter "${filter.id}" is not allowed for dataset "${query.dataset}" in query "${query.id}"`
      );
    }

    const rawValue = rawFilters?.[filter.id];
    switch (filter.type) {
      case 'search': {
        const value = typeof rawValue === 'string' ? rawValue.trim() : '';
        if (value) {
          normalized[filter.id] = value;
        }
        break;
      }
      case 'select':
      case 'dependent_select': {
        const value = typeof rawValue === 'string' ? rawValue.trim() : '';
        if (value) {
          normalized[filter.id] = value;
        }
        break;
      }
      case 'toggle':
        normalized[filter.id] = toBoolean(rawValue);
        break;
      case 'number_range':
        normalized[filter.id] = parseRangeValue(rawValue);
        break;
      default:
        break;
    }
  }

  return normalized;
}

function buildCompoundWhereSql(filters) {
  const where = [];
  const params = [];

  if (filters.search) {
    const search = safeLikeValue(filters.search);
    where.push('(cs.compoundname LIKE ? COLLATE NOCASE OR cs.cpd LIKE ? COLLATE NOCASE)');
    params.push(search, search);
  }

  if (filters.compoundclass && filters.compoundclass !== 'all') {
    where.push('cs.compoundclass = ?');
    params.push(filters.compoundclass);
  }

  if (filters.reference_ag && filters.reference_ag !== 'all') {
    where.push(`
      EXISTS (
        SELECT 1
        FROM compound_reference_map crm
        WHERE crm.cpd = cs.cpd
          AND crm.reference_ag = ?
      )
    `);
    params.push(filters.reference_ag);
  }

  const koRange = filters.ko_count || {};
  if (koRange.min !== undefined) {
    where.push('cs.ko_count >= ?');
    params.push(koRange.min);
  }
  if (koRange.max !== undefined) {
    where.push('cs.ko_count <= ?');
    params.push(koRange.max);
  }

  const geneRange = filters.gene_count || {};
  if (geneRange.min !== undefined) {
    where.push('cs.gene_count >= ?');
    params.push(geneRange.min);
  }
  if (geneRange.max !== undefined) {
    where.push('cs.gene_count <= ?');
    params.push(geneRange.max);
  }

  const pathwayRange = filters.pathway_count || {};
  if (pathwayRange.min !== undefined) {
    where.push('cs.pathway_count >= ?');
    params.push(pathwayRange.min);
  }
  if (pathwayRange.max !== undefined) {
    where.push('cs.pathway_count <= ?');
    params.push(pathwayRange.max);
  }

  return {
    whereSql: where.length > 0 ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
}

function buildSummaryCards(query, values) {
  return (query.summary_cards || []).map((card) => ({
    id: card.id,
    label: card.label,
    value: values[card.value_key] ?? null,
    hint: card.hint ?? null,
  }));
}

function buildVisualizations(query, valuesByDataKey) {
  return (query.visualizations || []).map((vis) => ({
    id: vis.id,
    type: vis.type,
    title: vis.title,
    subtitle: vis.subtitle ?? null,
    data_key: vis.data_key,
    data: valuesByDataKey[vis.data_key] ?? null,
  }));
}

function buildTable(query, tableResult) {
  if (!query.table) {
    return null;
  }
  return {
    ...query.table,
    rows: tableResult.rows,
    page: tableResult.page,
    pageSize: tableResult.pageSize,
    total: tableResult.total,
    totalPages: tableResult.totalPages,
  };
}

function executeRankedMetric({ db, query, filters, page, pageSize }) {
  const metricField = query.executor_config?.metric_field || 'ko_count';
  const sortField = query.executor_config?.sort_field || metricField;
  const sortOrder = String(query.executor_config?.sort_order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  if (!['ko_count', 'gene_count', 'pathway_count', 'reference_count'].includes(sortField)) {
    throw new Error(`Unsupported sort field for ${query.id}: ${sortField}`);
  }

  const { whereSql, params } = buildCompoundWhereSql(filters);

  const total = db.prepare(`SELECT COUNT(*) AS total FROM compound_summary cs ${whereSql}`).get(...params).total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * pageSize;

  const rows = db
    .prepare(
      `
      SELECT
        cs.cpd,
        cs.compoundname,
        cs.compoundclass,
        cs.ko_count,
        cs.gene_count,
        cs.pathway_count
      FROM compound_summary cs
      ${whereSql}
      ORDER BY cs.${sortField} ${sortOrder}, cs.cpd ASC
      LIMIT ? OFFSET ?
    `
    )
    .all(...params, pageSize, offset);

  const rankingRows = rows.map((row, idx) => ({
    rank: offset + idx + 1,
    cpd: row.cpd,
    compoundname: row.compoundname,
    compoundclass: row.compoundclass,
    ko_count: Number(row.ko_count) || 0,
    gene_count: Number(row.gene_count) || 0,
    pathway_count: Number(row.pathway_count) || 0,
  }));

  const barItems = rankingRows.map((row) => ({
    id: row.cpd,
    label: row.compoundname || row.cpd,
    value: Number(row[metricField]) || 0,
    tooltip: `${row.cpd} - ${metricField}: ${Number(row[metricField]) || 0}`,
    color: '#2563eb',
  }));

  return {
    summaryValues: {
      compounds_in_scope: total,
      ranked_metric_label: metricField,
    },
    visualizationValues: {
      bar_items: {
        items: barItems,
        empty_message: 'No ranking data available.',
      },
    },
    table: {
      rows: rankingRows,
      total,
      page: safePage,
      pageSize,
      totalPages,
    },
  };
}

function executeMostToxicCompounds({ db, query, filters, page, pageSize }) {
  const riskMode = filters.risk_mode === 'group_peak' ? 'group_peak' : 'endpoint';
  const endpointGroup =
    typeof filters.endpoint_group === 'string' && filters.endpoint_group.trim() !== ''
      ? filters.endpoint_group.trim()
      : 'all';

  const allEndpoints = readDistinctStrings(
    db,
    `
      SELECT DISTINCT endpoint AS value
      FROM toxicity_endpoint
      WHERE endpoint IS NOT NULL
      ORDER BY endpoint
    `
  );
  const groupEndpoints =
    endpointGroup === 'all'
      ? allEndpoints
      : allEndpoints.filter((candidate) => getEndpointGroupKey(candidate) === endpointGroup);

  if (groupEndpoints.length === 0) {
    throw new Error(`No toxicity endpoints found for endpoint_group "${endpointGroup}"`);
  }

  let endpoint = typeof filters.endpoint === 'string' ? filters.endpoint.trim() : '';
  if (riskMode === 'endpoint') {
    if (!endpoint) {
      endpoint = groupEndpoints[0];
    }
    if (!endpoint) {
      throw new Error('UC2 requires a valid endpoint selection');
    }
    if (endpointGroup !== 'all' && getEndpointGroupKey(endpoint) !== endpointGroup) {
      throw new Error(`Endpoint "${endpoint}" is not part of endpoint_group "${endpointGroup}"`);
    }
  }

  const { whereSql, params } = buildCompoundWhereSql(filters);
  const scopeTotal = db.prepare(`SELECT COUNT(*) AS total FROM compound_summary cs ${whereSql}`).get(...params).total;
  const yRange = filters.y_value || {};

  const metricRows =
    riskMode === 'endpoint'
      ? db
          .prepare(
            `
            SELECT
              cs.cpd,
              cs.compoundname,
              cs.compoundclass,
              cs.gene_count,
              cs.ko_count,
              cs.pathway_count,
              te.value AS endpoint_value,
              te.endpoint AS endpoint_used
            FROM compound_summary cs
            LEFT JOIN toxicity_endpoint te
              ON te.cpd = cs.cpd
             AND te.endpoint = ?
            ${whereSql}
            ORDER BY cs.cpd ASC
          `
          )
          .all(endpoint, ...params)
      : (() => {
          const endpointPlaceholders = groupEndpoints.map(() => '?').join(', ');
          return db
            .prepare(
              `
              WITH endpoint_scope AS (
                SELECT
                  cpd,
                  endpoint,
                  value
                FROM toxicity_endpoint
                WHERE value IS NOT NULL
                  AND endpoint IN (${endpointPlaceholders})
              ),
              endpoint_max AS (
                SELECT
                  cpd,
                  MAX(value) AS endpoint_value
                FROM endpoint_scope
                GROUP BY cpd
              ),
              endpoint_choice AS (
                SELECT
                  es.cpd,
                  MIN(es.endpoint) AS endpoint_used
                FROM endpoint_scope es
                JOIN endpoint_max em
                  ON em.cpd = es.cpd
                 AND em.endpoint_value = es.value
                GROUP BY es.cpd
              )
              SELECT
                cs.cpd,
                cs.compoundname,
                cs.compoundclass,
                cs.gene_count,
                cs.ko_count,
                cs.pathway_count,
                em.endpoint_value,
                ec.endpoint_used
              FROM compound_summary cs
              LEFT JOIN endpoint_max em
                ON em.cpd = cs.cpd
              LEFT JOIN endpoint_choice ec
                ON ec.cpd = cs.cpd
              ${whereSql}
              ORDER BY cs.cpd ASC
            `
            )
            .all(...groupEndpoints, ...params);
        })();

  let excludedNullY = 0;
  const rankedRowsRaw = [];
  for (const row of metricRows) {
    const yValue = row.endpoint_value === null || row.endpoint_value === undefined ? null : Number(row.endpoint_value);
    if (yValue === null || Number.isNaN(yValue)) {
      excludedNullY += 1;
      continue;
    }

    if (yRange.min !== undefined && yValue < yRange.min) {
      continue;
    }
    if (yRange.max !== undefined && yValue > yRange.max) {
      continue;
    }

    rankedRowsRaw.push({
      cpd: row.cpd,
      compoundname: row.compoundname,
      compoundclass: row.compoundclass,
      gene_count: Number(row.gene_count) || 0,
      ko_count: Number(row.ko_count) || 0,
      pathway_count: Number(row.pathway_count) || 0,
      y_value: yValue,
      endpoint_used: row.endpoint_used || endpoint || null,
    });
  }

  const rankedRows = rankedRowsRaw.sort((a, b) => {
    const riskDelta = b.y_value - a.y_value;
    if (riskDelta !== 0) {
      return riskDelta;
    }
    const potentialDelta = b.gene_count - a.gene_count;
    if (potentialDelta !== 0) {
      return potentialDelta;
    }
    return a.cpd.localeCompare(b.cpd);
  });

  const total = rankedRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * pageSize;
  const tableRows = rankedRows.slice(offset, offset + pageSize).map((row, idx) => ({
    rank: offset + idx + 1,
    ...row,
  }));

  const heatmapTopN = Math.min(200, parsePositiveInt(query.executor_config?.heatmap_top_n, 25));
  const heatmapCompounds = rankedRows.slice(0, heatmapTopN);
  const heatmapEndpoints = riskMode === 'endpoint' ? [endpoint] : groupEndpoints;

  let heatmapCells = [];
  if (heatmapCompounds.length > 0 && heatmapEndpoints.length > 0) {
    const cpdPlaceholders = heatmapCompounds.map(() => '?').join(', ');
    const endpointPlaceholders = heatmapEndpoints.map(() => '?').join(', ');
    heatmapCells = db
      .prepare(
        `
          SELECT
            cpd,
            endpoint,
            label,
            value
          FROM toxicity_endpoint
          WHERE cpd IN (${cpdPlaceholders})
            AND endpoint IN (${endpointPlaceholders})
          ORDER BY cpd ASC, endpoint ASC
        `
      )
      .all(
        ...heatmapCompounds.map((row) => row.cpd),
        ...heatmapEndpoints
      )
      .map((row) => ({
        cpd: row.cpd,
        endpoint: row.endpoint,
        label: row.label,
        value: row.value === null ? null : Number(row.value),
        risk_bucket: deriveRiskBucket(row.label),
      }));
  }

  const endpointContext =
    riskMode === 'endpoint'
      ? `Endpoint: ${formatEndpoint(endpoint)}`
      : `Endpoint Group Peak: ${
          endpointGroup === 'all' ? 'All Groups' : getEndpointGroupTitle(endpointGroup)
        }`;

  return {
    summaryValues: {
      compounds_in_scope: scopeTotal,
      ranked_points: rankedRows.length,
      excluded_null_y: excludedNullY,
      endpoint_context: endpointContext,
      risk_mode_label: riskMode === 'endpoint' ? 'Single Endpoint' : 'Endpoint Group Peak',
    },
    visualizationValues: {
      toxicity_matrix: {
        compounds: heatmapCompounds.map((row) => ({
          cpd: row.cpd,
          compoundname: row.compoundname || null,
          compoundclass: row.compoundclass || null,
          y_value: row.y_value,
          endpoint_used: row.endpoint_used,
        })),
        endpoints: heatmapEndpoints,
        cells: heatmapCells,
        total_compounds_in_scope: rankedRows.length,
      },
    },
    table: {
      rows: tableRows,
      total,
      page: safePage,
      pageSize,
      totalPages,
    },
    extraMeta: {
      risk_mode: riskMode,
      endpoint_group: endpointGroup,
      endpoint: riskMode === 'endpoint' ? endpoint : null,
      endpoint_count: heatmapEndpoints.length,
      excluded_null_y: excludedNullY,
    },
  };
}

function executeRegulatedByAgency({ db, query, filters, page, pageSize }) {
  const allAgencies = readDistinctStrings(
    db,
    `
      SELECT DISTINCT reference_ag AS value
      FROM compound_reference_map
      WHERE reference_ag IS NOT NULL
      ORDER BY reference_ag ASC
    `
  );
  if (allAgencies.length === 0) {
    throw new Error('No reference agencies available in compound_reference_map');
  }

  const selectedAgency =
    typeof filters.reference_ag === 'string' && filters.reference_ag.trim() !== ''
      ? filters.reference_ag.trim()
      : 'all';
  const agencyFilterOn = selectedAgency !== 'all';
  if (agencyFilterOn && !allAgencies.includes(selectedAgency)) {
    throw new Error(`Unsupported regulatory agency selection "${selectedAgency}"`);
  }

  const baseFilters = {
    ...filters,
  };
  delete baseFilters.reference_ag;
  const { whereSql: baseWhereSql, params: baseParams } = buildCompoundWhereSql(baseFilters);
  const scopeTotal = db
    .prepare(`SELECT COUNT(*) AS total FROM compound_summary cs ${baseWhereSql}`)
    .get(...baseParams).total;

  const matchedWhereSql = agencyFilterOn
    ? baseWhereSql
      ? `${baseWhereSql} AND crm.reference_ag = ?`
      : 'WHERE crm.reference_ag = ?'
    : baseWhereSql;
  const matchedParams = agencyFilterOn ? [...baseParams, selectedAgency] : [...baseParams];

  const total = db
    .prepare(
      `
      SELECT COUNT(DISTINCT cs.cpd) AS total
      FROM compound_summary cs
      JOIN compound_reference_map crm
        ON crm.cpd = cs.cpd
      ${matchedWhereSql}
      `
    )
    .get(...matchedParams).total;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * pageSize;

  const rows = db
    .prepare(
      `
      SELECT
        cs.cpd,
        cs.compoundname,
        cs.compoundclass,
        cs.reference_count,
        cs.ko_count,
        cs.gene_count,
        cs.pathway_count,
        GROUP_CONCAT(DISTINCT crm.reference_ag) AS matched_references
      FROM compound_summary cs
      JOIN compound_reference_map crm
        ON crm.cpd = cs.cpd
      ${matchedWhereSql}
      GROUP BY
        cs.cpd,
        cs.compoundname,
        cs.compoundclass,
        cs.reference_count,
        cs.ko_count,
        cs.gene_count,
        cs.pathway_count
      ORDER BY cs.reference_count DESC, cs.cpd ASC
      LIMIT ? OFFSET ?
      `
    )
    .all(...matchedParams, pageSize, offset)
    .map((row, idx) => ({
      rank: offset + idx + 1,
      cpd: row.cpd,
      compoundname: row.compoundname,
      compoundclass: row.compoundclass,
      reference_count: Number(row.reference_count) || 0,
      ko_count: Number(row.ko_count) || 0,
      gene_count: Number(row.gene_count) || 0,
      pathway_count: Number(row.pathway_count) || 0,
      matched_references: String(row.matched_references || ''),
    }));

  const countsByAgencyRaw = db
    .prepare(
      `
      SELECT
        crm.reference_ag AS agency,
        COUNT(DISTINCT cs.cpd) AS compounds
      FROM compound_summary cs
      JOIN compound_reference_map crm
        ON crm.cpd = cs.cpd
      ${matchedWhereSql}
      GROUP BY crm.reference_ag
      ORDER BY compounds DESC, crm.reference_ag ASC
      `
    )
    .all(...matchedParams);

  const barItems = countsByAgencyRaw.map((row, idx) => {
    const agency = String(row.agency);
    const compounds = Number(row.compounds) || 0;
    const palette = ['#2563eb', '#0ea5e9', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6', '#84cc16', '#64748b'];
    return {
    id: agency,
    label: agency,
      value: compounds,
      tooltip: `${agency}: ${compounds} compounds`,
      color: palette[idx % palette.length],
    };
  });

  return {
    summaryValues: {
      compounds_in_scope: scopeTotal,
      regulated_compounds: total,
      selected_agency: selectedAgency === 'all' ? 'All agencies' : selectedAgency,
    },
    visualizationValues: {
      agency_bar: {
        items: barItems,
        empty_message: 'No regulatory reference data available for current filters.',
      },
    },
    table: {
      rows,
      total,
      page: safePage,
      pageSize,
      totalPages,
    },
    extraMeta: {
      selected_agency: selectedAgency,
      active_agencies: agencyFilterOn ? [selectedAgency] : allAgencies,
    },
  };
}

function executePathwayFunctionalCoverage({ db, query, filters, page, pageSize }) {
  const selectedSource =
    typeof filters.source === 'string' && filters.source.trim() !== '' ? filters.source.trim() : 'all';

  const where = [];
  const params = [];
  if (selectedSource !== 'all') {
    where.push('rel.source = ?');
    params.push(selectedSource);
  }

  if (filters.pathway) {
    where.push('rel.pathway LIKE ? COLLATE NOCASE');
    params.push(safeLikeValue(filters.pathway));
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const groupedSql = `
    SELECT
      rel.pathway AS pathway,
      COUNT(DISTINCT rel.ko) AS ko_count,
      COUNT(DISTINCT rel.cpd) AS compound_count
    FROM compound_ko_pathway_rel rel
    ${whereSql}
    GROUP BY rel.pathway
  `;

  const koRange = filters.ko_count || {};
  const compoundRange = filters.compound_count || {};
  const having = [];
  const havingParams = [];
  if (koRange.min !== undefined) {
    having.push('ko_count >= ?');
    havingParams.push(koRange.min);
  }
  if (koRange.max !== undefined) {
    having.push('ko_count <= ?');
    havingParams.push(koRange.max);
  }
  if (compoundRange.min !== undefined) {
    having.push('compound_count >= ?');
    havingParams.push(compoundRange.min);
  }
  if (compoundRange.max !== undefined) {
    having.push('compound_count <= ?');
    havingParams.push(compoundRange.max);
  }

  const groupedWithHavingSql = `
    ${groupedSql}
    ${having.length > 0 ? `HAVING ${having.join(' AND ')}` : ''}
  `;

  const total = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM (${groupedWithHavingSql}) scope
      `
    )
    .get(...params, ...havingParams).total;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * pageSize;

  const rowsRaw = db
    .prepare(
      `
      SELECT
        pathway,
        ko_count,
        compound_count
      FROM (${groupedWithHavingSql}) scope
      ORDER BY ko_count DESC, pathway ASC
      LIMIT ? OFFSET ?
      `
    )
    .all(...params, ...havingParams, pageSize, offset);

  const rows = rowsRaw.map((row, idx) => ({
    rank: offset + idx + 1,
    pathway: row.pathway,
    source: selectedSource === 'all' ? 'Mixed' : selectedSource,
    ko_count: Number(row.ko_count) || 0,
    compound_count: Number(row.compound_count) || 0,
  }));

  const topN = Math.min(100, parsePositiveInt(query.executor_config?.bar_top_n, 10));
  const barItems = db
    .prepare(
      `
      SELECT
        pathway,
        ko_count
      FROM (${groupedWithHavingSql}) scope
      ORDER BY ko_count DESC, pathway ASC
      LIMIT ?
      `
    )
    .all(...params, ...havingParams, topN)
    .map((row) => ({
      id: row.pathway,
      label: row.pathway,
      value: Number(row.ko_count) || 0,
      tooltip: `${row.pathway}: ${Number(row.ko_count) || 0} KOs`,
      color: '#2563eb',
    }));

  const maxKo = barItems.length > 0 ? Math.max(...barItems.map((item) => item.value)) : 0;

  return {
    summaryValues: {
      pathways_in_scope: total,
      selected_source: selectedSource === 'all' ? 'All sources' : selectedSource,
      max_ko_count: maxKo,
    },
    visualizationValues: {
      bar_items: {
        items: barItems,
        empty_message: 'No pathways available for current filters.',
      },
    },
    table: {
      rows,
      total,
      page: safePage,
      pageSize,
      totalPages,
    },
    extraMeta: {
      selected_source: selectedSource,
      metric_basis: 'count(distinct ko) by pathway',
    },
  };
}

function executeRiskPotentialScatter({ db, query, filters, page, pageSize }) {
  const thresholdBasis = String(query.executor_config?.threshold_basis || 'p75_filtered_scope');
  const defaultXScale = String(query.defaults?.x_scale || 'log10p1').toLowerCase();
  const xScaleModeRaw = typeof filters.x_scale === 'string' ? filters.x_scale.toLowerCase() : defaultXScale;
  const xScaleMode = xScaleModeRaw === 'linear' ? 'linear' : 'log10p1';
  const endpoint = filters.endpoint && filters.endpoint !== 'mean' ? filters.endpoint : null;

  const { whereSql, params } = buildCompoundWhereSql(filters);
  const scopeTotal = db.prepare(`SELECT COUNT(*) AS total FROM compound_summary cs ${whereSql}`).get(...params).total;

  const yRange = filters.y_value || {};

  const rows = endpoint
    ? db
        .prepare(
          `
          SELECT
            cs.cpd,
            cs.compoundname,
            cs.compoundclass,
            cs.gene_count,
            cs.ko_count,
            cs.pathway_count,
            cs.toxicity_risk_mean,
            te.value AS endpoint_value
          FROM compound_summary cs
          LEFT JOIN toxicity_endpoint te
            ON te.cpd = cs.cpd
           AND te.endpoint = ?
          ${whereSql}
          ORDER BY cs.cpd ASC
        `
        )
        .all(endpoint, ...params)
    : db
        .prepare(
          `
          SELECT
            cs.cpd,
            cs.compoundname,
            cs.compoundclass,
            cs.gene_count,
            cs.ko_count,
            cs.pathway_count,
            cs.toxicity_risk_mean,
            cs.toxicity_risk_mean AS endpoint_value
          FROM compound_summary cs
          ${whereSql}
          ORDER BY cs.cpd ASC
        `
        )
        .all(...params);

  let excludedNullY = 0;
  const pointsRaw = [];

  for (const row of rows) {
    const yValue = row.endpoint_value === null || row.endpoint_value === undefined ? null : Number(row.endpoint_value);
    if (yValue === null || Number.isNaN(yValue)) {
      excludedNullY += 1;
      continue;
    }

    if (yRange.min !== undefined && yValue < yRange.min) {
      continue;
    }
    if (yRange.max !== undefined && yValue > yRange.max) {
      continue;
    }

    pointsRaw.push({
      cpd: row.cpd,
      compoundname: row.compoundname,
      compoundclass: row.compoundclass,
      gene_count: Number(row.gene_count) || 0,
      ko_count: Number(row.ko_count) || 0,
      pathway_count: Number(row.pathway_count) || 0,
      toxicity_risk_mean:
        row.toxicity_risk_mean === null || row.toxicity_risk_mean === undefined
          ? null
          : Number(row.toxicity_risk_mean),
      y_value: yValue,
    });
  }

  let points = pointsRaw;
  let geneP95 = null;
  if (filters.focus_cluster) {
    geneP95 = percentile(pointsRaw.map((point) => point.gene_count), 0.95);
    if (geneP95 !== undefined) {
      points = pointsRaw.filter((point) => point.gene_count <= geneP95);
    }
  }

  const xThreshold =
    percentile(points.map((point) => point.gene_count), 0.75) ??
    percentile(pointsRaw.map((point) => point.gene_count), 0.75) ??
    0;
  const yThreshold =
    percentile(points.map((point) => point.y_value), 0.75) ??
    percentile(pointsRaw.map((point) => point.y_value), 0.75) ??
    0.5;

  const pointsWithQuadrant = points.map((point) => ({
    ...point,
    quadrant: quadrantFor(point, xThreshold, yThreshold),
  }));

  const quadrantCounts = {
    top_right: 0,
    top_left: 0,
    bottom_right: 0,
    bottom_left: 0,
  };
  for (const point of pointsWithQuadrant) {
    quadrantCounts[point.quadrant] += 1;
  }

  const topRightRows = pointsWithQuadrant
    .filter((point) => point.quadrant === 'top_right')
    .sort((a, b) => {
      const riskDelta = b.y_value - a.y_value;
      if (riskDelta !== 0) {
        return riskDelta;
      }
      const potentialDelta = b.gene_count - a.gene_count;
      if (potentialDelta !== 0) {
        return potentialDelta;
      }
      return a.cpd.localeCompare(b.cpd);
    });

  const total = topRightRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * pageSize;
  const topRightPageRows = topRightRows.slice(offset, offset + pageSize).map((row, idx) => ({
    rank: offset + idx + 1,
    ...row,
  }));

  const yMetricLabel = endpoint ? formatEndpoint(endpoint) : 'toxicity_risk_mean';
  const yMetricKey = endpoint || 'toxicity_risk_mean';

  const quadrantSum =
    quadrantCounts.top_right + quadrantCounts.top_left + quadrantCounts.bottom_right + quadrantCounts.bottom_left;

  return {
    summaryValues: {
      compounds_in_scope: scopeTotal,
      plotted_points: pointsWithQuadrant.length,
      excluded_null_y: excludedNullY,
      top_right_count: quadrantCounts.top_right,
      quadrant_sum_check: quadrantSum,
      thresholds_label: `x(P75)=${xThreshold}, y(P75)=${yThreshold.toFixed(3)}`,
    },
    visualizationValues: {
      scatter_points: {
        points: pointsWithQuadrant,
        x_threshold: xThreshold,
        y_threshold: yThreshold,
        x_field: 'gene_count',
        y_field: yMetricKey,
        y_metric_label: yMetricLabel,
        endpoint: endpoint || 'mean',
        x_scale: xScaleMode,
        threshold_basis: thresholdBasis,
      },
    },
    table: {
      rows: topRightPageRows,
      total,
      page: safePage,
      pageSize,
      totalPages,
    },
    extraMeta: {
      excluded_null_y: excludedNullY,
      points_count: pointsWithQuadrant.length,
      quadrant_counts: quadrantCounts,
      y_metric_key: yMetricKey,
      y_metric_label: yMetricLabel,
      x_threshold: xThreshold,
      y_threshold: yThreshold,
      threshold_basis: thresholdBasis,
      x_scale: xScaleMode,
      focus_cluster: Boolean(filters.focus_cluster),
      gene_p95: geneP95 ?? null,
    },
  };
}

export function createGuidedEngine({ db, projectRoot }) {
  const catalogLoader = createGuidedCatalogLoader({ projectRoot });

  function getCatalogResponse() {
    const catalog = catalogLoader.getCatalog();
    return {
      version: catalog.version,
      title: catalog.title,
      categories: catalog.categories,
      queries: catalog.queries,
      generated_at: catalog.generated_at ?? null,
    };
  }

  function getQueryOptions(queryId, selectedFilters = {}) {
    const query = catalogLoader.getQueryOrThrow(queryId);
    const normalizedFilters = normalizeFilters(query, selectedFilters);
    const optionsByFilter = {};

    for (const filter of query.filters || []) {
      const provider = filter.provider;
      if (!provider) {
        continue;
      }

      if (provider.type === 'meta_endpoint') {
        optionsByFilter[filter.id] = resolveMetaEndpointOptions(db, provider.endpoint);
      } else if (provider.type === 'static') {
        optionsByFilter[filter.id] = (provider.options || []).map((option) => ({
          value: option.value,
          label: option.label,
        }));
      } else if (provider.type === 'query_derived') {
        optionsByFilter[filter.id] = resolveQueryDerivedOptions(db, provider, normalizedFilters);
      } else {
        throw new Error(`Unsupported guided provider type: ${provider.type}`);
      }
    }

    return {
      query_id: query.id,
      options: optionsByFilter,
    };
  }

  function executeQuery(queryId, payload = {}) {
    const startedAt = Date.now();
    const catalog = catalogLoader.getCatalog();
    const query = catalogLoader.getQueryOrThrow(queryId);

    const defaultPageSize = parsePositiveInt(query.defaults?.page_size, 10);
    const page = parsePositiveInt(payload.page, 1);
    const pageSize = Math.min(200, parsePositiveInt(payload.pageSize, defaultPageSize));
    const filters = normalizeFilters(query, payload.filters || {});

    const executor = EXECUTOR_REGISTRY[query.executor];
    if (!executor) {
      throw new Error(`No guided executor registered for "${query.executor}"`);
    }

    const result = executor({
      db,
      query,
      filters,
      page,
      pageSize,
    });

    return {
      meta: {
        query_id: query.id,
        dataset: query.dataset,
        version: catalog.version,
        execution_ms: Date.now() - startedAt,
        page: result.table.page,
        pageSize: result.table.pageSize,
        total: result.table.total,
        totalPages: result.table.totalPages,
        ...(result.extraMeta || {}),
      },
      summary_cards: buildSummaryCards(query, result.summaryValues || {}),
      visualizations: buildVisualizations(query, result.visualizationValues || {}),
      table: buildTable(query, result.table),
      insights: (query.insights || []).map((insight) => ({
        id: insight.id,
        text: insight.text,
      })),
      filters_applied: filters,
    };
  }

  return {
    getCatalogResponse,
    getQueryOptions,
    executeQuery,
  };
}
