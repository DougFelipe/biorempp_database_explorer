import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const contactPath = path.join(projectRoot, 'src', 'config', 'contact.page.yaml');

const VALID_ICONS = new Set(['github', 'linkedin', 'instagram', 'email']);
const VALID_IMAGE_KEYS = new Set(['lbmg_logo', 'developer', 'supervisor']);

function fail(message) {
  throw new Error(`contact-config: ${message}`);
}

function assertObject(value, context) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${context} must be an object`);
  }
}

function assertString(value, context) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`${context} must be a non-empty string`);
  }
  return value.trim();
}

function assertArray(value, context) {
  if (!Array.isArray(value)) {
    fail(`${context} must be an array`);
  }
}

function assertUrlOrMailto(value, context) {
  const url = assertString(value, context);
  if (url.startsWith('mailto:')) {
    const email = url.slice('mailto:'.length).trim();
    if (!email || !email.includes('@')) {
      fail(`${context} invalid mailto format`);
    }
    return;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      fail(`${context} protocol must be http or https`);
    }
  } catch {
    fail(`${context} invalid URL`);
  }
}

function readYaml(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`missing file: ${path.relative(projectRoot, filePath)}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return parseYaml(raw);
  } catch (error) {
    fail(
      `invalid yaml in ${path.relative(projectRoot, filePath)}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function validate(root) {
  assertObject(root, 'contact.page.yaml');
  assertString(root.version, 'contact.page.yaml version');
  assertString(root.language, 'contact.page.yaml language');
  assertString(root.page_title, 'contact.page.yaml page_title');
  assertString(root.page_subtitle, 'contact.page.yaml page_subtitle');

  assertObject(root.laboratory, 'contact.page.yaml laboratory');
  assertString(root.laboratory.section_title, 'contact.page.yaml laboratory.section_title');
  assertString(root.laboratory.card_title, 'contact.page.yaml laboratory.card_title');
  assertString(root.laboratory.name, 'contact.page.yaml laboratory.name');
  assertArray(root.laboratory.paragraphs, 'contact.page.yaml laboratory.paragraphs');
  if (root.laboratory.paragraphs.length === 0) {
    fail('contact.page.yaml laboratory.paragraphs must include at least one paragraph');
  }
  root.laboratory.paragraphs.forEach((entry, index) => {
    assertString(entry, `contact.page.yaml laboratory.paragraphs[${index}]`);
  });
  const logoKey = assertString(root.laboratory.logo_image_key, 'contact.page.yaml laboratory.logo_image_key');
  if (!VALID_IMAGE_KEYS.has(logoKey)) {
    fail(`contact.page.yaml laboratory.logo_image_key unknown: ${logoKey}`);
  }

  assertObject(root.team, 'contact.page.yaml team');
  assertString(root.team.section_title, 'contact.page.yaml team.section_title');
  assertArray(root.team.members, 'contact.page.yaml team.members');
  if (root.team.members.length !== 2) {
    fail(`contact.page.yaml team.members must contain exactly 2 members, found ${root.team.members.length}`);
  }

  const memberIds = new Set();
  root.team.members.forEach((member, index) => {
    assertObject(member, `contact.page.yaml team.members[${index}]`);
    const memberId = assertString(member.id, `contact.page.yaml team.members[${index}].id`);
    if (memberIds.has(memberId)) {
      fail(`contact.page.yaml duplicated team member id: ${memberId}`);
    }
    memberIds.add(memberId);
    assertString(member.name, `contact.page.yaml team.members[${index}].name`);
    assertString(member.role, `contact.page.yaml team.members[${index}].role`);
    assertString(member.description, `contact.page.yaml team.members[${index}].description`);
    const imageKey = assertString(member.image_key, `contact.page.yaml team.members[${index}].image_key`);
    if (!VALID_IMAGE_KEYS.has(imageKey)) {
      fail(`contact.page.yaml team.members[${index}].image_key unknown: ${imageKey}`);
    }
    if (member.additional_info !== undefined) {
      assertString(member.additional_info, `contact.page.yaml team.members[${index}].additional_info`);
    }
    if (member.badge_text !== undefined) {
      assertString(member.badge_text, `contact.page.yaml team.members[${index}].badge_text`);
    }
  });

  assertObject(root.get_in_touch, 'contact.page.yaml get_in_touch');
  assertString(root.get_in_touch.section_title, 'contact.page.yaml get_in_touch.section_title');
  assertString(root.get_in_touch.intro, 'contact.page.yaml get_in_touch.intro');
  assertString(root.get_in_touch.email, 'contact.page.yaml get_in_touch.email');
  assertString(root.get_in_touch.social_title, 'contact.page.yaml get_in_touch.social_title');
  assertArray(root.get_in_touch.social_links, 'contact.page.yaml get_in_touch.social_links');
  if (root.get_in_touch.social_links.length === 0) {
    fail('contact.page.yaml get_in_touch.social_links must include at least one link');
  }

  const socialIds = new Set();
  root.get_in_touch.social_links.forEach((link, index) => {
    assertObject(link, `contact.page.yaml get_in_touch.social_links[${index}]`);
    const linkId = assertString(link.id, `contact.page.yaml get_in_touch.social_links[${index}].id`);
    if (socialIds.has(linkId)) {
      fail(`contact.page.yaml duplicated social link id: ${linkId}`);
    }
    socialIds.add(linkId);
    assertString(link.label, `contact.page.yaml get_in_touch.social_links[${index}].label`);
    const icon = assertString(link.icon, `contact.page.yaml get_in_touch.social_links[${index}].icon`);
    if (!VALID_ICONS.has(icon)) {
      fail(`contact.page.yaml get_in_touch.social_links[${index}].icon unknown: ${icon}`);
    }
    assertUrlOrMailto(link.url, `contact.page.yaml get_in_touch.social_links[${index}].url`);
  });
}

try {
  const root = readYaml(contactPath);
  validate(root);
  const sectionCount = 3;
  const teamMembers = root.team.members.length;
  console.log(
    `contact-config: validated ${teamMembers} team members across ${sectionCount} sections in ${path.relative(projectRoot, contactPath)}`
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
