'use client';
import { useLang } from '../../lib/i18n';
import { CONTACTS } from '../../lib/config';
export default function Help() {
  const { t } = useLang();
  return (<><h2>{t('helpTitle')}</h2>
    {CONTACTS.map(c => (<div className="card" key={c.num}>
      <div className="help-contact-name">{c.name}</div><div className="help-contact-role">{t(c.role)}</div><div className="help-contact-number" dir="ltr">{c.disp}</div>
      <div className="row" style={{ justifyContent: 'flex-start' }}>
        <a className="btn" href={`https://wa.me/${c.num}?text=${encodeURIComponent(t(c.msg))}`} target="_blank" rel="noopener noreferrer">{t('wa')}</a>
      </div></div>))}
  </>);
}
