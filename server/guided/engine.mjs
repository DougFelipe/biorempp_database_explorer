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
    'toxic_compound_count',
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
  uc_gene_connectivity_ranking: executeGeneConnectivityRanking,
  uc_gene_toxic_compounds_endpoint: executeGeneToxicCompoundsEndpoint,
  uc_pathways_toxic_compounds: executePathwaysToxicCompounds,
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

function deriveRiskBucketFromValue(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'unknown';
  }
  const numericValue = Number(value);
  if (numericValue >= 0.67) {
    return 'high_risk';
  }
  if (numericValue >= 0.34) {
    return 'medium_risk';
  }
  return 'low_risk';
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

function executeGeneConnectivityRanking({ db, query, filters, page, pageSize }) {
  const groupedSql = `
    SELECT
      cgm.genesymbol AS genesymbol,
      MIN(NULLIF(TRIM(cgc.genename), '')) AS gene_name,
      COUNT(DISTINCT cgm.cpd) AS compound_count,
      COUNT(DISTINCT cgc.ko) AS ko_count
    FROM compound_gene_map cgm
    LEFT JOIN compound_gene_card cgc
      ON cgc.cpd = cgm.cpd
     AND cgc.genesymbol = cgm.genesymbol
    WHERE cgm.genesymbol IS NOT NULL
      AND TRIM(cgm.genesymbol) <> ''
    GROUP BY cgm.genesymbol
  `;

  const where = [];
  const params = [];

  if (filters.search) {
    const search = safeLikeValue(filters.search);
    where.push('(genesymbol LIKE ? COLLATE NOCASE OR gene_name LIKE ? COLLATE NOCASE)');
    params.push(search, search);
  }

  const compoundRange = filters.compound_count || {};
  if (compoundRange.min !== undefined) {
    where.push('compound_count >= ?');
    params.push(compoundRange.min);
  }
  if (compoundRange.max !== undefined) {
    where.push('compound_count <= ?');
    params.push(compoundRange.max);
  }

  const koRange = filters.ko_count || {};
  if (koRange.min !== undefined) {
    where.push('ko_count >= ?');
    params.push(koRange.min);
  }
  if (koRange.max !== undefined) {
    where.push('ko_count <= ?');
    params.push(koRange.max);
  }

  const scopedSql = `
    SELECT
      genesymbol,
      gene_name,
      compound_count,
      ko_count
    FROM (${groupedSql}) scope
    ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
  `;

  const total = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM (${scopedSql}) ranked
      `
    )
    .get(...params).total;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * pageSize;

  const rowsRaw = db
    .prepare(
      `
      SELECT
        genesymbol,
        gene_name,
        compound_count,
        ko_count
      FROM (${scopedSql}) ranked
      ORDER BY compound_count DESC, genesymbol ASC
      LIMIT ? OFFSET ?
      `
    )
    .all(...params, pageSize, offset);

  const rows = rowsRaw.map((row, idx) => ({
    rank: offset + idx + 1,
    genesymbol: row.genesymbol,
    gene_name: row.gene_name,
    compound_count: Number(row.compound_count) || 0,
    ko_count: Number(row.ko_count) || 0,
  }));

  const topN = Math.min(100, parsePositiveInt(query.executor_config?.bar_top_n, 10));
  const barItems = db
    .prepare(
      `
      SELECT
        genesymbol,
        compound_count
      FROM (${scopedSql}) ranked
      ORDER BY compound_count DESC, genesymbol ASC
      LIMIT ?
      `
    )
    .all(...params, topN)
    .map((row) => ({
      id: row.genesymbol,
      label: row.genesymbol,
      value: Number(row.compound_count) || 0,
      tooltip: `${row.genesymbol}: ${Number(row.compound_count) || 0} compounds`,
      color: '#2563eb',
    }));

  const maxCompoundCount = barItems.length > 0 ? Math.max(...barItems.map((item) => item.value)) : 0;

  return {
    summaryValues: {
      genes_in_scope: total,
      max_compound_count: maxCompoundCount,
      ranked_metric_label: 'compound_count',
    },
    visualizationValues: {
      bar_items: {
        items: barItems,
        empty_message: 'No genes available for current filters.',
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
      metric_basis: 'count(distinct cpd) by genesymbol',
    },
  };
}

function executeGeneToxicCompoundsEndpoint({ db, query, filters, page, pageSize }) {
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
  if (!endpoint) {
    endpoint = groupEndpoints[0];
  }
  if (!endpoint) {
    throw new Error('UC8 requires a valid endpoint selection');
  }
  if (endpointGroup !== 'all' && getEndpointGroupKey(endpoint) !== endpointGroup) {
    throw new Error(`Endpoint "${endpoint}" is not part of endpoint_group "${endpointGroup}"`);
  }

  const where = ['cgm.genesymbol IS NOT NULL', "TRIM(cgm.genesymbol) <> ''"];
  const whereParams = [];

  if (filters.search) {
    const search = safeLikeValue(filters.search);
    where.push('(cgm.genesymbol LIKE ? COLLATE NOCASE OR cgc.genename LIKE ? COLLATE NOCASE)');
    whereParams.push(search, search);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const baseRows = db
    .prepare(
      `
      SELECT
        cgm.genesymbol AS genesymbol,
        MIN(NULLIF(TRIM(cgc.genename), '')) AS gene_name,
        COUNT(DISTINCT cgm.cpd) AS compound_count,
        COUNT(DISTINCT cgc.ko) AS ko_count
      FROM compound_gene_map cgm
      LEFT JOIN compound_gene_card cgc
        ON cgc.cpd = cgm.cpd
       AND cgc.genesymbol = cgm.genesymbol
      ${whereSql}
      GROUP BY cgm.genesymbol
      `
    )
    .all(...whereParams);

  const yRange = filters.y_value || {};
  const toxicityWhere = ['te.value IS NOT NULL'];
  const toxicityParams = [];
  if (yRange.min !== undefined) {
    toxicityWhere.push('te.value >= ?');
    toxicityParams.push(yRange.min);
  }
  if (yRange.max !== undefined) {
    toxicityWhere.push('te.value <= ?');
    toxicityParams.push(yRange.max);
  }

  const distributionRows = db
    .prepare(
      `
      SELECT
        cgm.genesymbol AS genesymbol,
        cgm.cpd AS cpd,
        MIN(NULLIF(TRIM(cs.compoundname), '')) AS compoundname,
        te.value AS toxicity_value
      FROM compound_gene_map cgm
      LEFT JOIN compound_gene_card cgc
        ON cgc.cpd = cgm.cpd
       AND cgc.genesymbol = cgm.genesymbol
      LEFT JOIN compound_summary cs
        ON cs.cpd = cgm.cpd
      LEFT JOIN toxicity_endpoint te
        ON te.cpd = cgm.cpd
       AND te.endpoint = ?
      ${whereSql}
        AND ${toxicityWhere.join(' AND ')}
      GROUP BY cgm.genesymbol, cgm.cpd
      ORDER BY cgm.genesymbol ASC, te.value ASC
      `
    )
    .all(endpoint, ...whereParams, ...toxicityParams);

  const toxicityEntriesByGene = new Map();
  for (const row of distributionRows) {
    const value = Number(row.toxicity_value);
    if (!Number.isFinite(value)) {
      continue;
    }
    const genesymbol = String(row.genesymbol || '').trim();
    const cpd = String(row.cpd || '').trim();
    if (!genesymbol || !cpd) {
      continue;
    }
    let entries = toxicityEntriesByGene.get(genesymbol);
    if (!entries) {
      entries = [];
      toxicityEntriesByGene.set(genesymbol, entries);
    }
    entries.push({
      cpd,
      compoundname: row.compoundname || null,
      toxicity_value: value,
      endpoint,
    });
  }

  const toxicByGene = new Map();
  for (const [genesymbol, entries] of toxicityEntriesByGene.entries()) {
    const values = entries.map((entry) => entry.toxicity_value).sort((a, b) => a - b);
    const min = values[0];
    const median = percentile(values, 0.5) ?? min;
    const p90 = percentile(values, 0.9) ?? values[values.length - 1];
    const max = values[values.length - 1];

    toxicByGene.set(genesymbol, {
      toxic_compound_count: entries.length,
      min_prediction: Number(min.toFixed(4)),
      median_toxicity: Number(median.toFixed(4)),
      p90_toxicity: Number(p90.toFixed(4)),
      max_prediction: Number(max.toFixed(4)),
    });
  }

  const compoundRange = filters.compound_count || {};
  const toxicCompoundRange = filters.toxic_compound_count || {};
  const koRange = filters.ko_count || {};

  const rankedRows = baseRows
    .map((row) => {
      const compoundCount = Number(row.compound_count) || 0;
      const koCount = Number(row.ko_count) || 0;
      const toxicInfo = toxicByGene.get(row.genesymbol) || { toxic_compound_count: 0, max_prediction: null };
      const toxicCompoundCount = toxicInfo.toxic_compound_count;

      return {
        genesymbol: row.genesymbol,
        gene_name: row.gene_name,
        compound_count: compoundCount,
        toxic_compound_count: toxicCompoundCount,
        ko_count: koCount,
        median_toxicity: toxicInfo.median_toxicity ?? null,
        p90_toxicity: toxicInfo.p90_toxicity ?? null,
        max_prediction: toxicInfo.max_prediction,
      };
    })
    .filter((row) => row.toxic_compound_count > 0)
    .filter((row) => {
      if (compoundRange.min !== undefined && row.compound_count < compoundRange.min) {
        return false;
      }
      if (compoundRange.max !== undefined && row.compound_count > compoundRange.max) {
        return false;
      }
      if (toxicCompoundRange.min !== undefined && row.toxic_compound_count < toxicCompoundRange.min) {
        return false;
      }
      if (toxicCompoundRange.max !== undefined && row.toxic_compound_count > toxicCompoundRange.max) {
        return false;
      }
      if (koRange.min !== undefined && row.ko_count < koRange.min) {
        return false;
      }
      if (koRange.max !== undefined && row.ko_count > koRange.max) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const toxicDelta = b.toxic_compound_count - a.toxic_compound_count;
      if (toxicDelta !== 0) {
        return toxicDelta;
      }
      const maxDelta = (b.max_prediction || 0) - (a.max_prediction || 0);
      if (maxDelta !== 0) {
        return maxDelta;
      }
      return a.genesymbol.localeCompare(b.genesymbol);
    });

  const total = rankedRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * pageSize;
  const tableRows = rankedRows.slice(offset, offset + pageSize).map((row, idx) => ({
    rank: offset + idx + 1,
    ...row,
  }));

  const barTopN = Math.min(200, parsePositiveInt(query.executor_config?.bar_top_n, 15));
  const barItems = rankedRows.slice(0, barTopN).map((row) => ({
    id: row.genesymbol,
    label: row.genesymbol,
    value: row.toxic_compound_count,
    tooltip: `${row.genesymbol}: ${row.toxic_compound_count} toxic compounds`,
    color: '#2563eb',
  }));

  const boxplotTopN = Math.min(100, parsePositiveInt(query.executor_config?.boxplot_top_n, 12));
  const boxplotGenes = rankedRows.slice(0, boxplotTopN).map((row) => row.genesymbol);

  const boxplotGroups = boxplotGenes
    .map((genesymbol) => {
      const entries = (toxicityEntriesByGene.get(genesymbol) || []).sort(
        (a, b) => a.toxicity_value - b.toxicity_value
      );
      if (entries.length === 0) {
        return null;
      }
      const stats = toxicByGene.get(genesymbol);
      if (!stats) {
        return null;
      }

      const pointSampleLimit = 120;
      const samplingStep = Math.max(1, Math.ceil(entries.length / pointSampleLimit));
      const sampledPoints = entries
        .filter((_, idx) => idx % samplingStep === 0)
        .slice(0, pointSampleLimit)
        .map((entry) => ({
          cpd: entry.cpd,
          compoundname: entry.compoundname || null,
          endpoint: entry.endpoint,
          toxicity_value: Number(entry.toxicity_value.toFixed(4)),
        }));

      return {
        id: genesymbol,
        label: genesymbol,
        count: entries.length,
        min: stats.min_prediction,
        q1: Number((percentile(entries.map((entry) => entry.toxicity_value), 0.25) ?? stats.min_prediction).toFixed(4)),
        median: stats.median_toxicity,
        q3: Number((percentile(entries.map((entry) => entry.toxicity_value), 0.75) ?? stats.max_prediction).toFixed(4)),
        max: stats.max_prediction,
        points: sampledPoints,
      };
    })
    .filter((group) => group !== null);

  const endpointContext =
    endpointGroup === 'all'
      ? `Endpoint: ${formatEndpoint(endpoint)}`
      : `Endpoint: ${formatEndpoint(endpoint)} (${getEndpointGroupTitle(endpointGroup)})`;
  const thresholdWindow =
    yRange.min !== undefined && yRange.max !== undefined
      ? `${yRange.min} to ${yRange.max}`
      : yRange.min !== undefined
        ? `>= ${yRange.min}`
        : yRange.max !== undefined
          ? `<= ${yRange.max}`
          : 'Any non-null value';

  return {
    summaryValues: {
      genes_in_scope: total,
      toxic_compounds_peak: rankedRows.length > 0 ? rankedRows[0].toxic_compound_count : 0,
      endpoint_context: endpointContext,
      threshold_window: thresholdWindow,
    },
    visualizationValues: {
      toxicity_boxplot: {
        groups: boxplotGroups,
        y_label: `Endpoint toxicity score (${formatEndpoint(endpoint)})`,
        empty_message: 'No boxplot data available for selected toxicity filters.',
      },
      bar_items: {
        items: barItems,
        empty_message: 'No genes available for selected toxicity filters.',
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
      endpoint_group: endpointGroup,
      endpoint,
      threshold_min: yRange.min ?? null,
      threshold_max: yRange.max ?? null,
      metric_basis: 'count(distinct cpd) by genesymbol with endpoint threshold',
    },
  };
}

function executePathwaysToxicCompounds({ db, query, filters, page, pageSize }) {
  const selectedSource =
    typeof filters.source === 'string' && filters.source.trim() !== '' ? filters.source.trim() : 'all';
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
      throw new Error('UC6 requires a valid endpoint selection');
    }
    if (endpointGroup !== 'all' && getEndpointGroupKey(endpoint) !== endpointGroup) {
      throw new Error(`Endpoint "${endpoint}" is not part of endpoint_group "${endpointGroup}"`);
    }
  }

  const yRange = filters.y_value || {};
  const compoundRange = filters.compound_count || {};
  const toxicCompoundRange = filters.toxic_compound_count || {};

  const baseWhere = [];
  const baseParams = [];
  if (selectedSource !== 'all') {
    baseWhere.push('rel.source = ?');
    baseParams.push(selectedSource);
  }
  if (filters.pathway) {
    baseWhere.push('rel.pathway LIKE ? COLLATE NOCASE');
    baseParams.push(safeLikeValue(filters.pathway));
  }
  const baseWhereSql = baseWhere.length > 0 ? `WHERE ${baseWhere.join(' AND ')}` : '';

  const riskRows =
    riskMode === 'endpoint'
      ? db
          .prepare(
            `
            SELECT
              b.pathway,
              b.source,
              b.cpd,
              te.value AS y_value,
              te.endpoint AS endpoint_used
            FROM (
              SELECT DISTINCT rel.pathway, rel.source, rel.cpd
              FROM compound_ko_pathway_rel rel
              ${baseWhereSql}
            ) b
            LEFT JOIN toxicity_endpoint te
              ON te.cpd = b.cpd
             AND te.endpoint = ?
            ORDER BY b.pathway ASC, b.cpd ASC
            `
          )
          .all(...baseParams, endpoint)
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
                  MAX(value) AS y_value
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
                 AND em.y_value = es.value
                GROUP BY es.cpd
              )
              SELECT
                b.pathway,
                b.source,
                b.cpd,
                em.y_value,
                ec.endpoint_used
              FROM (
                SELECT DISTINCT rel.pathway, rel.source, rel.cpd
                FROM compound_ko_pathway_rel rel
                ${baseWhereSql}
              ) b
              LEFT JOIN endpoint_max em
                ON em.cpd = b.cpd
              LEFT JOIN endpoint_choice ec
                ON ec.cpd = b.cpd
              ORDER BY b.pathway ASC, b.cpd ASC
              `
            )
            .all(...groupEndpoints, ...baseParams);
        })();

  const pathwayStats = new Map();
  const compoundsInScope = new Set();
  const toxicCompoundsInScope = new Set();

  for (const row of riskRows) {
    const pathway = String(row.pathway || '').trim();
    if (!pathway) {
      continue;
    }
    const source = String(row.source || '').trim() || (selectedSource === 'all' ? 'Mixed' : selectedSource);
    const cpd = String(row.cpd || '').trim();
    if (!cpd) {
      continue;
    }
    compoundsInScope.add(cpd);

    let stat = pathwayStats.get(pathway);
    if (!stat) {
      stat = {
        pathway,
        sourceSet: new Set(),
        compounds: new Set(),
        toxicCompounds: new Set(),
        maxPrediction: null,
      };
      pathwayStats.set(pathway, stat);
    }

    stat.sourceSet.add(source);
    stat.compounds.add(cpd);

    const yValue = row.y_value === null || row.y_value === undefined ? null : Number(row.y_value);
    if (yValue === null || Number.isNaN(yValue)) {
      continue;
    }
    if (yRange.min !== undefined && yValue < yRange.min) {
      continue;
    }
    if (yRange.max !== undefined && yValue > yRange.max) {
      continue;
    }

    stat.toxicCompounds.add(cpd);
    stat.maxPrediction = stat.maxPrediction === null ? yValue : Math.max(stat.maxPrediction, yValue);
    toxicCompoundsInScope.add(cpd);
  }

  const rankedRows = [...pathwayStats.values()]
    .map((stat) => {
      const compoundCount = stat.compounds.size;
      const toxicCompoundCount = stat.toxicCompounds.size;
      const toxicRatio = compoundCount > 0 ? Number(((toxicCompoundCount / compoundCount) * 100).toFixed(2)) : 0;
      return {
        pathway: stat.pathway,
        source:
          selectedSource === 'all'
            ? stat.sourceSet.size > 1
              ? 'Mixed'
              : [...stat.sourceSet][0] || 'Mixed'
            : selectedSource,
        compound_count: compoundCount,
        toxic_compound_count: toxicCompoundCount,
        toxic_ratio: toxicRatio,
        max_prediction: stat.maxPrediction === null ? null : Number(stat.maxPrediction.toFixed(4)),
      };
    })
    .filter((row) => row.toxic_compound_count > 0)
    .filter((row) => {
      if (compoundRange.min !== undefined && row.compound_count < compoundRange.min) {
        return false;
      }
      if (compoundRange.max !== undefined && row.compound_count > compoundRange.max) {
        return false;
      }
      if (toxicCompoundRange.min !== undefined && row.toxic_compound_count < toxicCompoundRange.min) {
        return false;
      }
      if (toxicCompoundRange.max !== undefined && row.toxic_compound_count > toxicCompoundRange.max) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const toxicDelta = b.toxic_compound_count - a.toxic_compound_count;
      if (toxicDelta !== 0) {
        return toxicDelta;
      }
      const maxDelta = (b.max_prediction || 0) - (a.max_prediction || 0);
      if (maxDelta !== 0) {
        return maxDelta;
      }
      return a.pathway.localeCompare(b.pathway);
    });

  const total = rankedRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * pageSize;
  const tableRows = rankedRows.slice(offset, offset + pageSize).map((row, idx) => ({
    rank: offset + idx + 1,
    ...row,
  }));

  const barTopN = Math.min(200, parsePositiveInt(query.executor_config?.bar_top_n, 10));
  const barItems = rankedRows.slice(0, barTopN).map((row) => ({
    id: row.pathway,
    label: row.pathway,
    value: row.toxic_compound_count,
    tooltip: `${row.pathway}: ${row.toxic_compound_count} toxic compounds`,
    color: '#2563eb',
  }));

  const heatmapTopN = Math.min(200, parsePositiveInt(query.executor_config?.heatmap_top_n, 30));
  const heatmapPathways = rankedRows.slice(0, heatmapTopN).map((row) => row.pathway);
  const heatmapPathwaySet = new Set(heatmapPathways);
  const heatmapCompoundsByPathway = new Map();

  for (const row of riskRows) {
    const pathway = String(row.pathway || '').trim();
    const cpd = String(row.cpd || '').trim();
    const yValue = row.y_value === null || row.y_value === undefined ? null : Number(row.y_value);
    if (!pathway || !cpd || !heatmapPathwaySet.has(pathway) || yValue === null || Number.isNaN(yValue)) {
      continue;
    }
    if (yRange.min !== undefined && yValue < yRange.min) {
      continue;
    }
    if (yRange.max !== undefined && yValue > yRange.max) {
      continue;
    }
    let set = heatmapCompoundsByPathway.get(pathway);
    if (!set) {
      set = new Set();
      heatmapCompoundsByPathway.set(pathway, set);
    }
    set.add(cpd);
  }

  const heatmapEndpoints = endpointGroup === 'all' ? allEndpoints : groupEndpoints;
  let heatmapCells = [];
  if (heatmapPathways.length > 0 && heatmapEndpoints.length > 0) {
    const pathwayCompoundPairs = [];
    for (const pathway of heatmapPathways) {
      const cpds = [...(heatmapCompoundsByPathway.get(pathway) || new Set())];
      for (const cpd of cpds) {
        pathwayCompoundPairs.push({ pathway, cpd });
      }
    }

    if (pathwayCompoundPairs.length > 0) {
      const endpointPlaceholders = heatmapEndpoints.map(() => '?').join(', ');
      const pairPlaceholders = pathwayCompoundPairs.map(() => '(?, ?)').join(', ');
      const pairParams = pathwayCompoundPairs.flatMap((pair) => [pair.pathway, pair.cpd]);
      heatmapCells = db
        .prepare(
          `
          WITH pathway_cpd(pathway, cpd) AS (
            VALUES ${pairPlaceholders}
          )
          SELECT
            pc.pathway AS row_id,
            te.endpoint AS endpoint,
            MAX(te.value) AS value
          FROM pathway_cpd pc
          JOIN toxicity_endpoint te
            ON te.cpd = pc.cpd
          WHERE te.endpoint IN (${endpointPlaceholders})
            AND te.value IS NOT NULL
          GROUP BY pc.pathway, te.endpoint
          ORDER BY pc.pathway ASC, te.endpoint ASC
          `
        )
        .all(...pairParams, ...heatmapEndpoints)
        .map((row) => {
          const numericValue = row.value === null || row.value === undefined ? null : Number(row.value);
          const bucket = deriveRiskBucketFromValue(numericValue);
          const label =
            bucket === 'high_risk' ? 'High Risk' : bucket === 'medium_risk' ? 'Medium Risk' : bucket === 'low_risk' ? 'Low Risk' : null;
          return {
            row_id: row.row_id,
            cpd: row.row_id,
            endpoint: row.endpoint,
            label,
            value: numericValue,
            risk_bucket: bucket,
          };
        });
    }
  }

  const endpointContext =
    riskMode === 'endpoint'
      ? `Endpoint: ${formatEndpoint(endpoint)}`
      : `Endpoint Group Peak: ${
          endpointGroup === 'all' ? 'All Groups' : getEndpointGroupTitle(endpointGroup)
        }`;

  return {
    summaryValues: {
      pathways_in_scope: total,
      compounds_in_scope: compoundsInScope.size,
      toxic_compounds_in_scope: toxicCompoundsInScope.size,
      risk_mode_label: riskMode === 'endpoint' ? 'Single Endpoint' : 'Endpoint Group Peak',
      endpoint_context: endpointContext,
    },
    visualizationValues: {
      bar_items: {
        items: barItems,
        empty_message: 'No pathways available for selected toxicity filters.',
      },
      toxicity_matrix: {
        row_label: 'Pathway',
        row_label_plural: 'Pathways',
        rows: heatmapPathways.map((pathway) => {
          const row = rankedRows.find((item) => item.pathway === pathway);
          return {
            id: pathway,
            label: pathway,
            secondary_label:
              row ? `${row.toxic_compound_count}/${row.compound_count} toxic compounds` : null,
          };
        }),
        compounds: [],
        endpoints: heatmapEndpoints,
        cells: heatmapCells,
        total_rows_in_scope: rankedRows.length,
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
      threshold_min: yRange.min ?? null,
      threshold_max: yRange.max ?? null,
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
