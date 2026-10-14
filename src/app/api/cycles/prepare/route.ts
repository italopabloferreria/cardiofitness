import { z } from 'zod';
import { getAppData, cycleFromRow, evaluationFromRow } from '@/lib/server/data';
import { cycleSchema, idSchema, validateParticipants } from '@/lib/server/validation';
import { requireRh } from '@/lib/server/supabase';
import { ApiError, assertOrigin, databaseError, handle, json, parseBody } from '@/lib/server/http';
import { prepareCycleForms } from '@/lib/cycle-template';
import { formPeriodConflict } from '@/lib/server/integrity';
const schema=z.object({sourceCycleId:idSchema,cycle:cycleSchema}).strict();
export async function POST(request:Request){return handle(async()=>{
 assertOrigin(request);const {client}=await requireRh();const body=await parseBody(request,schema);const app=await getAppData(client);
 if(!app.cycles.some(c=>c.id===body.sourceCycleId))throw new ApiError(404,'Ciclo de referência não encontrado.');
 const problem=validateParticipants(body.cycle,app.employees);if(problem)throw new ApiError(409,problem);
 const forms=prepareCycleForms(app,body.sourceCycleId,body.cycle);
 if(!forms.length)throw new ApiError(409,'O ciclo de referência não possui formulários.');
 for(const form of forms){const conflict=formPeriodConflict(form,{...app,cycles:[...app.cycles,{...body.cycle,id:'prepared'}]});if(conflict)throw new ApiError(409,conflict);}
 const {data,error}=await client.rpc('prepare_evaluation_cycle',{p_source_cycle_id:body.sourceCycleId,p_cycle:body.cycle,p_forms:forms});databaseError(error);
 if(!data?.cycle||!Array.isArray(data?.evaluations))throw new ApiError(503,'Não foi possível confirmar a preparação do ciclo.');
 return json({cycle:cycleFromRow(data.cycle),evaluations:data.evaluations.map(evaluationFromRow)},201);
});}
