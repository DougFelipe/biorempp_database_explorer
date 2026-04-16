import { parse as parseYaml } from 'yaml';
import rawContactCatalog from './contact.page.yaml?raw';
import { resolveContactImage } from './contactAssets';
import type {
  ContactGetInTouchSection,
  ContactLinkItem,
  ContactPageCatalog,
  ContactSocialIcon,
  ContactTeamMember,
} from '../types/contact';

const VALID_ICONS = new Set<ContactSocialIcon>(['github', 'linkedin', 'instagram', 'email']);

function assertNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid contact config at ${path}: expected non-empty string`);
  }
  return value.trim();
}

function assertStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Invalid contact config at ${path}: expected non-empty array`);
  }
  return value.map((entry, index) => assertNonEmptyString(entry, `${path}[${index}]`));
}

function assertValidLink(url: string, path: string): string {
  if (url.startsWith('mailto:')) {
    const email = url.slice('mailto:'.length).trim();
    if (!email || !email.includes('@')) {
      throw new Error(`Invalid contact config at ${path}: invalid mailto link`);
    }
    return `mailto:${email}`;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('unsupported protocol');
    }
    return url;
  } catch {
    throw new Error(`Invalid contact config at ${path}: invalid URL`);
  }
}

function normalizeTeamMember(rawMember: unknown, index: number): ContactTeamMember {
  if (!rawMember || typeof rawMember !== 'object' || Array.isArray(rawMember)) {
    throw new Error(`Invalid contact config at team.members[${index}]: expected object`);
  }
  const member = rawMember as Record<string, unknown>;
  const imageKey = assertNonEmptyString(member.image_key, `team.members[${index}].image_key`);
  resolveContactImage(imageKey);

  return {
    id: assertNonEmptyString(member.id, `team.members[${index}].id`),
    name: assertNonEmptyString(member.name, `team.members[${index}].name`),
    role: assertNonEmptyString(member.role, `team.members[${index}].role`),
    description: assertNonEmptyString(member.description, `team.members[${index}].description`),
    image_key: imageKey,
    additional_info:
      typeof member.additional_info === 'string' && member.additional_info.trim() !== ''
        ? member.additional_info.trim()
        : undefined,
    badge_text:
      typeof member.badge_text === 'string' && member.badge_text.trim() !== ''
        ? member.badge_text.trim()
        : undefined,
  };
}

function normalizeSocialLink(rawLink: unknown, index: number): ContactLinkItem {
  if (!rawLink || typeof rawLink !== 'object' || Array.isArray(rawLink)) {
    throw new Error(`Invalid contact config at get_in_touch.social_links[${index}]: expected object`);
  }
  const link = rawLink as Record<string, unknown>;

  const icon = assertNonEmptyString(link.icon, `get_in_touch.social_links[${index}].icon`) as ContactSocialIcon;
  if (!VALID_ICONS.has(icon)) {
    throw new Error(
      `Invalid contact config at get_in_touch.social_links[${index}].icon: expected one of github|linkedin|instagram|email`
    );
  }

  const url = assertValidLink(
    assertNonEmptyString(link.url, `get_in_touch.social_links[${index}].url`),
    `get_in_touch.social_links[${index}].url`
  );

  return {
    id: assertNonEmptyString(link.id, `get_in_touch.social_links[${index}].id`),
    label: assertNonEmptyString(link.label, `get_in_touch.social_links[${index}].label`),
    icon,
    url,
  };
}

function normalizeGetInTouch(rawValue: unknown): ContactGetInTouchSection {
  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
    throw new Error('Invalid contact config at get_in_touch: expected object');
  }
  const section = rawValue as Record<string, unknown>;
  if (!Array.isArray(section.social_links) || section.social_links.length === 0) {
    throw new Error('Invalid contact config at get_in_touch.social_links: expected non-empty array');
  }

  return {
    section_title: assertNonEmptyString(section.section_title, 'get_in_touch.section_title'),
    intro: assertNonEmptyString(section.intro, 'get_in_touch.intro'),
    email: assertNonEmptyString(section.email, 'get_in_touch.email'),
    social_title: assertNonEmptyString(section.social_title, 'get_in_touch.social_title'),
    social_links: section.social_links.map((link, index) => normalizeSocialLink(link, index)),
  };
}

function loadContactCatalog(): ContactPageCatalog {
  let parsed: unknown;
  try {
    parsed = parseYaml(rawContactCatalog);
  } catch (error) {
    throw new Error(
      `Invalid contact config YAML syntax: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid contact config: root must be an object');
  }

  const root = parsed as Record<string, unknown>;
  const laboratory = root.laboratory;
  const team = root.team;
  const getInTouch = root.get_in_touch;

  if (!laboratory || typeof laboratory !== 'object' || Array.isArray(laboratory)) {
    throw new Error('Invalid contact config at laboratory: expected object');
  }
  if (!team || typeof team !== 'object' || Array.isArray(team)) {
    throw new Error('Invalid contact config at team: expected object');
  }
  if (!Array.isArray((team as Record<string, unknown>).members)) {
    throw new Error('Invalid contact config at team.members: expected array');
  }

  const labObject = laboratory as Record<string, unknown>;
  const labLogoKey = assertNonEmptyString(labObject.logo_image_key, 'laboratory.logo_image_key');
  resolveContactImage(labLogoKey);

  const members = ((team as Record<string, unknown>).members as unknown[]).map((member, index) =>
    normalizeTeamMember(member, index)
  );
  if (members.length !== 2) {
    throw new Error(`Invalid contact config at team.members: expected exactly 2 members, found ${members.length}`);
  }
  const memberIds = new Set<string>();
  for (const member of members) {
    if (memberIds.has(member.id)) {
      throw new Error(`Invalid contact config at team.members: duplicated id "${member.id}"`);
    }
    memberIds.add(member.id);
  }

  const socialLinks = normalizeGetInTouch(getInTouch).social_links;
  const socialIds = new Set<string>();
  for (const link of socialLinks) {
    if (socialIds.has(link.id)) {
      throw new Error(`Invalid contact config at get_in_touch.social_links: duplicated id "${link.id}"`);
    }
    socialIds.add(link.id);
  }

  return {
    version: assertNonEmptyString(root.version, 'version'),
    language: assertNonEmptyString(root.language, 'language'),
    page_title: assertNonEmptyString(root.page_title, 'page_title'),
    page_subtitle: assertNonEmptyString(root.page_subtitle, 'page_subtitle'),
    laboratory: {
      section_title: assertNonEmptyString(labObject.section_title, 'laboratory.section_title'),
      card_title: assertNonEmptyString(labObject.card_title, 'laboratory.card_title'),
      name: assertNonEmptyString(labObject.name, 'laboratory.name'),
      paragraphs: assertStringArray(labObject.paragraphs, 'laboratory.paragraphs'),
      logo_image_key: labLogoKey,
    },
    team: {
      section_title: assertNonEmptyString(
        (team as Record<string, unknown>).section_title,
        'team.section_title'
      ),
      members,
    },
    get_in_touch: normalizeGetInTouch(getInTouch),
  };
}

export const CONTACT_CATALOG = loadContactCatalog();
