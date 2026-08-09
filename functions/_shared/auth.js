import {HttpError} from './http.js';
import {createRemoteJWKSet,jwtVerify} from 'jose';

const keySets = new Map();

export async function requireAdmin(context){
  const url = new URL(context.request.url);
  const local = (url.hostname === '127.0.0.1' || url.hostname === 'localhost') && context.env.ENVIRONMENT === 'development';
  if(local) return 'local-admin@tunewrap.test';

  const token = context.request.headers.get('Cf-Access-Jwt-Assertion');
  const teamDomain = String(context.env.ACCESS_TEAM_DOMAIN || '').replace(/\/$/,'');
  const audience = String(context.env.ACCESS_AUD || '');
  if(!token) throw new HttpError(401,'Требуется авторизация Cloudflare Access');
  if(!teamDomain || !audience) throw new HttpError(503,'Cloudflare Access JWT validation is not configured');
  if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/i.test(teamDomain)) throw new HttpError(503,'ACCESS_TEAM_DOMAIN has an invalid format');

  try{
    let jwks = keySets.get(teamDomain);
    if(!jwks){
      jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
      keySets.set(teamDomain,jwks);
    }
    const {payload} = await jwtVerify(token,jwks,{issuer:teamDomain,audience});
    const email = typeof payload.email === 'string' ? payload.email : context.request.headers.get('Cf-Access-Authenticated-User-Email');
    if(!email) throw new Error('Access token does not contain an email identity');
    return email;
  }catch(error){
    throw new HttpError(403,'Cloudflare Access token is invalid');
  }
}

export function requireSameOrigin(request){
  const origin = request.headers.get('origin');
  if(!origin) return;
  const url = new URL(request.url);
  if(new URL(origin).origin !== url.origin) throw new HttpError(403,'Запрос с другого источника отклонён');
}
