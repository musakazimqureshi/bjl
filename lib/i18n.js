'use client';
import { EN, UR } from './extra';
import { createContext, useContext, useEffect, useState } from 'react';
const D = {
 en:{home:'Home',register:'Register Team',teams:'Registered Teams',title:'Battagram Junior League',season:'Season 1 · Tape Ball Cricket',
  loc:'Dab Ground, Battagram, Khyber Pakhtunkhwa',reg:'REGISTERED TEAMS',slots:'AVAILABLE SLOTS',
  closed:'REGISTRATION IS CURRENTLY CLOSED',regBtn:'Register Your Team',viewBtn:'View Registered Teams',
  fee:'Admission fee: PKR 5,000 per team. A slot is confirmed only after the admin verifies your payment.',
  regTitle:'REGISTER YOUR TEAM – BJL SEASON 1',teamName:'Team Name',mgr:'Team Manager Name',mgrMob:'Manager Mobile',
  captain:'Captain',vice:'Vice-Captain',select:'Select',player:'Player',pname:'Name',mob:'Mobile (03XXXXXXXXX)',age:'Age',pos:'Position',photo:'Photo (JPG/PNG, max 2MB)',
  Batter:'Batter',Bowler:'Bowler','All-Rounder':'All-Rounder','Wicket-Keeper':'Wicket-Keeper',submit:'Submit Registration',sending:'Submitting...',
  ok:'Registration submitted! Status: PENDING admin approval. Save your tracking reference:',
  eMissing:'Please complete all fields for every player.',eMob:'Invalid mobile number for',ePhoto:'Photo must be JPG/PNG up to 2MB for',
  eDup:'Duplicate mobile number inside your team.',eCap:'Captain and Vice-Captain must be two different players.',eTeam:'Please fill team details and select Captain and Vice-Captain.',
  none:'No confirmed teams yet.',cap:'Captain',vc:'Vice-Captain'},
 ur:{home:'ہوم',register:'ٹیم رجسٹر کریں',teams:'رجسٹرڈ ٹیمیں',title:'بٹگرام جونیئر لیگ',season:'سیزن 1 · ٹیپ بال کرکٹ',
  loc:'ڈب گراؤنڈ، بٹگرام، خیبر پختونخوا',reg:'رجسٹرڈ ٹیمیں',slots:'دستیاب سلاٹس',
  closed:'رجسٹریشن فی الحال بند ہے',regBtn:'اپنی ٹیم رجسٹر کریں',viewBtn:'رجسٹرڈ ٹیمیں دیکھیں',
  fee:'داخلہ فیس: ہر ٹیم کے لیے 5,000 روپے۔ ایڈمن کے ادائیگی تصدیق کرنے کے بعد ہی آپ کی جگہ پکی ہوگی۔',
  regTitle:'اپنی ٹیم رجسٹر کریں – BJL سیزن 1',teamName:'ٹیم کا نام',mgr:'ٹیم مینیجر کا نام',mgrMob:'مینیجر کا موبائل',
  captain:'کپتان',vice:'نائب کپتان',select:'منتخب کریں',player:'کھلاڑی',pname:'نام',mob:'موبائل (03XXXXXXXXX)',age:'عمر',pos:'پوزیشن',photo:'تصویر (JPG/PNG، زیادہ سے زیادہ 2MB)',
  Batter:'بلے باز',Bowler:'باؤلر','All-Rounder':'آل راؤنڈر','Wicket-Keeper':'وکٹ کیپر',submit:'رجسٹریشن جمع کروائیں',sending:'جمع ہو رہی ہے...',
  ok:'رجسٹریشن جمع ہو گئی! حالت: ایڈمن کی منظوری کا انتظار۔ اپنا ٹریکنگ نمبر محفوظ کر لیں:',
  eMissing:'براہ کرم ہر کھلاڑی کی تمام معلومات مکمل کریں۔',eMob:'موبائل نمبر غلط ہے:',ePhoto:'تصویر JPG/PNG اور 2MB تک ہونی چاہیے:',
  eDup:'ٹیم میں ایک ہی موبائل نمبر دوبارہ لکھا گیا ہے۔',eCap:'کپتان اور نائب کپتان دو مختلف کھلاڑی ہونے چاہییں۔',eTeam:'ٹیم کی معلومات مکمل کریں اور کپتان و نائب کپتان منتخب کریں۔',
  none:'ابھی کوئی تصدیق شدہ ٹیم نہیں۔',cap:'کپتان',vc:'نائب کپتان'}};
Object.assign(D.en, EN); Object.assign(D.ur, UR);
const Ctx = createContext();
export function LangProvider({ children }) {
  const [lang, setLang] = useState('en');
  useEffect(() => { const l = localStorage.getItem('lang'); if (l) setLang(l); }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
    localStorage.setItem('lang', lang);
  }, [lang]);
  const t = k => D[lang][k] || D.en[k] || k;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}
export const useLang = () => useContext(Ctx);
