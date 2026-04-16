import {
  Building2,
  FlaskConical,
  Github,
  Instagram,
  Linkedin,
  Mail,
  Send,
  Users,
} from 'lucide-react';
import { CONTACT_CATALOG } from '../config/contactCatalog';
import { resolveContactImage } from '../config/contactAssets';
import type { ContactLinkItem } from '../types/contact';

function socialIcon(icon: ContactLinkItem['icon']) {
  if (icon === 'github') {
    return <Github className="w-8 h-8 text-gray-900" />;
  }
  if (icon === 'linkedin') {
    return <Linkedin className="w-8 h-8 text-[#0077B5]" />;
  }
  if (icon === 'instagram') {
    return <Instagram className="w-8 h-8 text-[#E4405F]" />;
  }
  return <Mail className="w-8 h-8 text-green-600" />;
}

function TeamCard({
  name,
  role,
  description,
  imageKey,
  additionalInfo,
  badgeText,
}: {
  name: string;
  role: string;
  description: string;
  imageKey: string;
  additionalInfo?: string;
  badgeText?: string;
}) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden h-full">
      <div className="relative w-full pt-[75%] bg-gray-100">
        <img
          src={resolveContactImage(imageKey)}
          alt={`${name} profile photo`}
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
      </div>
      <div className="p-4 space-y-2">
        <h4 className="text-2xl font-semibold text-gray-900 text-center leading-tight">{name}</h4>
        <p className="text-sm text-gray-500 text-center">{role}</p>
        {badgeText ? (
          <div className="text-center">
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
              {badgeText}
            </span>
          </div>
        ) : null}
        <p className="text-sm text-gray-700 leading-6 text-justify">{description}</p>
        {additionalInfo ? <p className="text-xs text-gray-500">{additionalInfo}</p> : null}
      </div>
    </article>
  );
}

export function ContactPage() {
  const labLogo = resolveContactImage(CONTACT_CATALOG.laboratory.logo_image_key);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
        <h2 className="text-4xl font-semibold text-gray-800 inline-flex items-center gap-3">
          <Users className="w-10 h-10 text-green-600" />
          {CONTACT_CATALOG.page_title}
        </h2>
        <p className="text-sm text-gray-500 mt-3">{CONTACT_CATALOG.page_subtitle}</p>
        <hr className="mt-6 border-gray-200" />
      </section>

      <section className="space-y-4">
        <h3 className="text-4xl font-semibold text-gray-800 inline-flex items-center gap-2">
          <Building2 className="w-8 h-8 text-green-600" />
          {CONTACT_CATALOG.laboratory.section_title}
        </h3>

        <article className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <header className="px-5 py-3 border-b border-gray-200 bg-gray-50">
            <h4 className="text-xl font-semibold text-gray-700 inline-flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-green-600" />
              {CONTACT_CATALOG.laboratory.card_title}
            </h4>
          </header>
          <div className="p-5 grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)] gap-5 items-center">
            <div className="flex items-center justify-center">
              <img
                src={labLogo}
                alt="LBMG logo"
                className="max-w-full h-auto max-h-[210px] object-contain"
              />
            </div>
            <div className="space-y-3">
              <h5 className="text-lg font-semibold text-gray-700">{CONTACT_CATALOG.laboratory.name}</h5>
              {CONTACT_CATALOG.laboratory.paragraphs.map((paragraph, index) => (
                <p key={`lab-paragraph-${index}`} className="text-sm text-gray-700 leading-6 text-justify">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="space-y-4">
        <h3 className="text-4xl font-semibold text-gray-800 inline-flex items-center gap-2">
          <Users className="w-8 h-8 text-green-600" />
          {CONTACT_CATALOG.team.section_title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CONTACT_CATALOG.team.members.map((member) => (
            <TeamCard
              key={member.id}
              name={member.name}
              role={member.role}
              description={member.description}
              imageKey={member.image_key}
              additionalInfo={member.additional_info}
              badgeText={member.badge_text}
            />
          ))}
        </div>
      </section>

      <section>
        <article className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <header className="px-5 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-xl font-semibold text-gray-700 inline-flex items-center gap-2">
              <Send className="w-5 h-5 text-green-600" />
              {CONTACT_CATALOG.get_in_touch.section_title}
            </h3>
          </header>
          <div className="p-6 space-y-4 text-center">
            <p className="text-sm text-gray-600">{CONTACT_CATALOG.get_in_touch.intro}</p>
            <a
              href={`mailto:${CONTACT_CATALOG.get_in_touch.email}`}
              className="text-xl font-semibold text-green-600 hover:text-green-700"
            >
              {CONTACT_CATALOG.get_in_touch.email}
            </a>
            <hr className="border-gray-200" />
            <p className="text-base text-gray-600">{CONTACT_CATALOG.get_in_touch.social_title}</p>
            <div className="flex items-center justify-center gap-7 py-1">
              {CONTACT_CATALOG.get_in_touch.social_links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target={link.url.startsWith('mailto:') ? undefined : '_blank'}
                  rel={link.url.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                  title={link.label}
                  aria-label={link.label}
                  className="hover:opacity-75 transition-opacity"
                >
                  {socialIcon(link.icon)}
                </a>
              ))}
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
