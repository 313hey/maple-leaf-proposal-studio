import {BRAND_LOGO,BRAND_LOGO_ALT} from './brand';

export function BrandLogo({variant='document'}:{variant?:'document'|'cover'|'sidebar'|'team'}) {
  return <img className={`brand-logo brand-logo--${variant}`} src={BRAND_LOGO} alt={BRAND_LOGO_ALT}/>;
}
