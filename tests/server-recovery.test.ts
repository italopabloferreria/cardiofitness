import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({createClient:vi.fn(),isDemoMode:vi.fn(),reset:vi.fn(),verify:vi.fn(),exchange:vi.fn(),getUser:vi.fn(),membership:vi.fn(),eq:vi.fn(),update:vi.fn(),signOut:vi.fn(),setCookie:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('../src/lib/server/supabase',()=>({createClient:mocks.createClient,isDemoMode:mocks.isDemoMode,getSupabaseConfig:()=>({url:'https://test.supabase.co',key:'test'})}));
vi.mock('next/headers',()=>({cookies:async()=>({getAll:()=>[{name:'sb-test-auth-token.0'},{name:'sb-test-auth-token-code-verifier'},{name:'other-cookie'}],set:mocks.setCookie})}));
import { POST as requestRecovery } from '../src/app/api/auth/recovery/request/route';
import { POST as confirmRecovery } from '../src/app/api/auth/recovery/confirm/route';
import { GET as callbackRecovery } from '../src/app/auth/recovery/route';
import { mappingSchema, recoveryConfirmSchema } from '../src/lib/server/validation';
const origin='https://cardio.example',email='rh@example.invalid';
const input={email,token:'123456',newPassword:'New-private-password',confirmation:'New-private-password'};
const call=(confirm=false,body:unknown=confirm?input:{email},requestOrigin=origin)=>(confirm?confirmRecovery:requestRecovery)(new Request(`${origin}/api/auth/recovery/${confirm?'confirm':'request'}`,{method:'POST',headers:{origin:requestOrigin,'content-type':'application/json'},body:JSON.stringify(body)}));
beforeEach(()=>{
  vi.resetAllMocks();process.env.APP_URL=origin;mocks.isDemoMode.mockReturnValue(false);
  mocks.createClient.mockResolvedValue({auth:{resetPasswordForEmail:mocks.reset,verifyOtp:mocks.verify,exchangeCodeForSession:mocks.exchange,getUser:mocks.getUser,updateUser:mocks.update,signOut:mocks.signOut},from:()=>({select:()=>({eq:mocks.eq})})});
  mocks.eq.mockReturnValue({maybeSingle:mocks.membership});
  mocks.reset.mockResolvedValue({error:null});mocks.verify.mockResolvedValue({data:{user:{id:'rh-uuid'},session:{access_token:'fake-test'}},error:null});
  mocks.exchange.mockResolvedValue({data:{user:{id:'rh-uuid'},session:{access_token:'fake-test'},redirectType:'recovery'},error:null});
  mocks.getUser.mockResolvedValue({data:{user:{id:'rh-uuid',email}},error:null});mocks.membership.mockResolvedValue({data:{user_id:'rh-uuid'},error:null});
  mocks.update.mockResolvedValue({error:null});mocks.signOut.mockResolvedValue({error:null});
});
describe('recuperação de senha sem concessão de RH',()=>{
  it.each([false,true])('bloqueia origem externa antes de consultar Auth (confirm=%s)',async confirm=>{
    expect((await call(confirm,confirm?input:{email},'https://external.invalid')).status).toBe(403);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it('demonstração nunca envia código real',async()=>{
    mocks.isDemoMode.mockReturnValue(true);expect((await call()).status).toBe(409);expect(mocks.reset).not.toHaveBeenCalled();
  });
  it('solicitação retorna mensagem genérica sem revelar existência do cadastro',async()=>{
    const response=await call();expect(response.status).toBe(200);expect(await response.json()).toMatchObject({sent:true});
    expect(mocks.reset).toHaveBeenCalledWith(email,{redirectTo:`${origin}/auth/recovery`});expect(mocks.membership).not.toHaveBeenCalled();
  });
  it.each([429,500])('não revela erro do provedor na solicitação HTTP %s',async status=>{
    mocks.reset.mockResolvedValue({error:{status,message:'private upstream detail'}});const response=await call();
    expect(response.status).toBe(status===429?429:503);expect(await response.text()).not.toContain('private upstream');
  });
  it.each([{...input,token:'abc123'},{...input,token:'12345'},{...input,token:'12345678901'},{...input,newPassword:'admin1234',confirmation:'admin1234'},{...input,confirmation:'Wrong-private-password'},{...input,newPassword:'á'.repeat(37),confirmation:'á'.repeat(37)}])('rejeita token/senha inválidos antes de Auth',async body=>{
    expect((await call(true,body)).status).toBe(400);expect(mocks.verify).not.toHaveBeenCalled();
  });
  it('exige OTP novo e UUID RH antes de modificar senha; encerra sessões',async()=>{
    expect((await call(true)).status).toBe(200);
    expect(mocks.verify).toHaveBeenCalledWith({email,token:input.token,type:'recovery'});
    expect(mocks.eq).toHaveBeenCalledWith('user_id','rh-uuid');expect(mocks.update).toHaveBeenCalledWith({password:input.newPassword});
    expect(mocks.signOut).toHaveBeenCalledWith({scope:'global'});expect(mocks.signOut).toHaveBeenCalledWith({scope:'local'});
    expect(mocks.verify.mock.invocationCallOrder[0]).toBeLessThan(mocks.getUser.mock.invocationCallOrder[0]);
    expect(mocks.membership.mock.invocationCallOrder[0]).toBeLessThan(mocks.update.mock.invocationCallOrder[0]);
    expect(mocks.setCookie).toHaveBeenCalledWith('sb-test-auth-token.0','',{path:'/',maxAge:0});
    expect(mocks.setCookie).not.toHaveBeenCalledWith('other-cookie',expect.anything(),expect.anything());
  });
  it.each([400,429])('OTP inválido/limitado nunca usa sessão existente para trocar senha',async status=>{
    mocks.verify.mockResolvedValue({data:{user:null,session:null},error:{status,message:'secret detail'}});
    const response=await call(true);expect(response.status).toBe(status);expect(mocks.getUser).not.toHaveBeenCalled();expect(mocks.update).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain('secret detail');expect(mocks.signOut).toHaveBeenCalledWith({scope:'local'});
  });
  it('não aceita UUID de sessão diferente do usuário que provou OTP',async()=>{
    mocks.getUser.mockResolvedValue({data:{user:{id:'different-user'}},error:null});expect((await call(true)).status).toBe(400);expect(mocks.update).not.toHaveBeenCalled();
  });
  it('usuário sem associação RH não ganha acesso nem troca senha por este fluxo',async()=>{
    mocks.membership.mockResolvedValue({data:null,error:null});expect((await call(true)).status).toBe(403);expect(mocks.update).not.toHaveBeenCalled();expect(mocks.signOut).toHaveBeenCalledWith({scope:'local'});
  });
  it('erro de autorização ou alteração limpa a sessão OTP',async()=>{
    mocks.update.mockResolvedValue({error:{message:'secret token'}});const response=await call(true);expect(response.status).toBe(400);expect(await response.text()).not.toContain('secret token');
    expect(mocks.signOut).toHaveBeenCalledWith({scope:'local'});expect(mocks.setCookie).toHaveBeenCalled();
  });
  it('limpa cookies mesmo se serviço falhar ao encerrar sessão',async()=>{
    mocks.signOut.mockRejectedValue(new Error('private unavailable'));const response=await call(true);expect(response.status).toBe(500);expect(await response.text()).not.toContain('private unavailable');expect(mocks.setCookie).toHaveBeenCalled();
  });
  it('troca por PKCE somente depois de comprovar fluxo recovery e associação RH',async()=>{
    const {email:_email,token:_token,...password}=input;
    expect((await call(true,{...password,code:'valid-recovery-code'})).status).toBe(200);
    expect(mocks.exchange).toHaveBeenCalledWith('valid-recovery-code');expect(mocks.verify).not.toHaveBeenCalled();expect(mocks.update).toHaveBeenCalledWith({password:input.newPassword});
  });
  it.each(['signin',null])('não usa código de login comum para trocar senha (%s)',async redirectType=>{
    mocks.exchange.mockResolvedValue({data:{user:{id:'rh-uuid'},session:{access_token:'fake-test'},redirectType},error:null});
    const {email:_email,token:_token,...password}=input;
    expect((await call(true,{...password,code:'login-code'})).status).toBe(400);expect(mocks.update).not.toHaveBeenCalled();expect(mocks.setCookie).toHaveBeenCalled();
  });
  it('falha PKCE sem verifier correto não usa sessão anterior',async()=>{
    mocks.exchange.mockResolvedValue({data:{user:null,session:null,redirectType:null},error:{status:400,message:'invalid verifier'}});
    const {email:_email,token:_token,...password}=input;
    expect((await call(true,{...password,code:'recovery-code'})).status).toBe(400);expect(mocks.getUser).not.toHaveBeenCalled();expect(mocks.update).not.toHaveBeenCalled();
  });
  it('não troca senha sem code ou OTP',async()=>{
    expect((await call(true,{newPassword:input.newPassword,confirmation:input.confirmation})).status).toBe(400);expect(mocks.exchange).not.toHaveBeenCalled();expect(mocks.verify).not.toHaveBeenCalled();
  });
  it('callback apenas encaminha código sem autenticar e usa origem fixa',async()=>{
    const response=await callbackRecovery(new Request('https://other.invalid/auth/recovery?code=recovery-code&next=https://evil.invalid'));
    expect(response.status).toBe(303);expect(response.headers.get('location')).toBe(`${origin}/?recovery=1&code=recovery-code`);expect(mocks.exchange).not.toHaveBeenCalled();expect(mocks.createClient).not.toHaveBeenCalled();expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  });
  it.each(['','?code='+ 'x'.repeat(4097),'?error=denied&code=secret-code'])('callback inválido remove código do retorno (%s)',async query=>{
    const response=await callbackRecovery(new Request(`${origin}/auth/recovery${query}`));expect(response.headers.get('location')).toBe(`${origin}/?recovery_error=invalid`);
  });
});
describe('limites e escala exigidos pelo RH',()=>{
  it('permite OTP de 6 a 10 dígitos e limite de 72 bytes',()=>{
    expect(recoveryConfirmSchema.safeParse({...input,token:'1234567890',newPassword:'á'.repeat(36),confirmation:'á'.repeat(36)}).success).toBe(true);
  });
  it.each([[1,3],[2,4],[2,3]])('recusa escala diferente de 1 a 4 (%s,%s)',(min,max)=>{
    expect(mappingSchema.safeParse({respondentQuestionIds:[],subjectQuestionIds:[],departmentQuestionIds:[],scoreQuestions:[{id:'score',title:'Nota',min,max}]}).success).toBe(false);
  });
});
