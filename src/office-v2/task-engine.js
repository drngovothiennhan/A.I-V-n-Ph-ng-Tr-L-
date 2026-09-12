import { TASK_STATES, TERMINAL_TASK_STATES, freezeContract } from './contracts.js';

const S=TASK_STATES;
export const TASK_TRANSITIONS=freezeContract({
  [S.RECEIVED]:[S.PLANNING,S.CANCELLED],
  [S.PLANNING]:[S.WAITING_PERMISSION,S.WAITING_APPROVAL,S.WAITING_INPUT,S.RUNNING,S.CANCELLED,S.FAILED],
  [S.WAITING_PERMISSION]:[S.RUNNING,S.CANCELLED,S.FAILED],
  [S.WAITING_APPROVAL]:[S.RUNNING,S.CANCELLED],
  [S.WAITING_INPUT]:[S.RUNNING,S.CANCELLED],
  [S.RUNNING]:[S.PAUSED,S.VERIFYING,S.CREATING_OUTPUT,S.COMPLETED,S.CANCELLED,S.FAILED],
  [S.PAUSED]:[S.RUNNING,S.CANCELLED],
  [S.VERIFYING]:[S.CREATING_OUTPUT,S.COMPLETED,S.RUNNING,S.CANCELLED,S.FAILED],
  [S.CREATING_OUTPUT]:[S.WAITING_APPROVAL,S.COMPLETED,S.CANCELLED,S.FAILED],
  [S.FAILED]:[S.PLANNING,S.CANCELLED],
  [S.COMPLETED]:[],
  [S.CANCELLED]:[S.PLANNING]
});

export const TASK_STORAGE_VERSION=1;
export const DEFAULT_TASK_STORAGE_KEY='ai-office-v2-tasks-v1';
export const DEFAULT_TASK_STORAGE_LIMIT=80;
const MAX_PERSISTED_HISTORY=120;
const SENSITIVE_METADATA_KEY=/(?:^|_)(?:token|secret|password|authorization|credential|api[_-]?key)(?:$|_)/i;

function now(){return new Date().toISOString()}
function id(){return globalThis.crypto?.randomUUID?.()||`task-${Date.now()}-${Math.random().toString(36).slice(2,8)}`}
function copy(value){return JSON.parse(JSON.stringify(value))}
function safeStorage(storage){
  if(storage)return storage;
  try{return typeof localStorage!=='undefined'?localStorage:null}catch{return null}
}
function sanitizeMetadata(metadata={}){
  if(!metadata||typeof metadata!=='object'||Array.isArray(metadata))return{};
  const safe={};
  for(const [key,value] of Object.entries(metadata)){
    if(SENSITIVE_METADATA_KEY.test(String(key))||value===undefined)continue;
    try{safe[key]=copy(value)}catch{}
  }
  return safe;
}
function taskForPersistence(task){
  const next=copy(task);
  next.metadata=sanitizeMetadata(next.metadata);
  if(Array.isArray(next.history)&&next.history.length>MAX_PERSISTED_HISTORY)next.history=next.history.slice(-MAX_PERSISTED_HISTORY);
  return next;
}
function readPersistedRows(storage,key){
  if(!storage)return[];
  try{
    const raw=storage.getItem(key);
    if(!raw)return[];
    const payload=JSON.parse(raw);
    if(Array.isArray(payload))return payload;
    if(!payload||payload.version!==TASK_STORAGE_VERSION||!Array.isArray(payload.rows))return[];
    return payload.rows;
  }catch{return[]}
}
function writePersistedRows(storage,key,rows){
  storage.setItem(key,JSON.stringify({version:TASK_STORAGE_VERSION,updatedAt:now(),rows}));
}

export function createTask({requestId,title,instruction,plan,metadata={}}={}){
  const text=String(instruction||'').trim();
  if(!text)throw new TypeError('task_instruction_required');
  const at=now();
  return {
    id:id(),requestId:requestId||null,title:String(title||text).slice(0,180),instruction:text,status:S.RECEIVED,
    createdAt:at,updatedAt:at,attempt:1,revision:1,plan:plan||null,metadata:{...metadata},
    history:[{at,from:null,to:S.RECEIVED,event:'create'}]
  };
}

export function canTransition(from,to){return Array.isArray(TASK_TRANSITIONS[from])&&TASK_TRANSITIONS[from].includes(to)}

export function transitionTask(task,to,{event='transition',reason=null,patch={}}={}){
  if(!task||typeof task!=='object')throw new TypeError('task_required');
  const from=task.status;if(from===to)return copy(task);
  if(!canTransition(from,to))throw new Error(`invalid_task_transition:${from}->${to}`);
  const at=now();
  const next={...copy(task),...patch,status:to,updatedAt:at,revision:Number(task.revision||0)+1};
  next.history=[...(Array.isArray(task.history)?task.history:[]),{at,from,to,event,reason}];
  return next;
}

export function cancelTask(task,reason='user_cancelled'){
  if(TERMINAL_TASK_STATES.has(task?.status))return copy(task);
  return transitionTask(task,S.CANCELLED,{event:'cancel',reason,patch:{cancelledAt:now(),cancelReason:reason}});
}
export function pauseTask(task){return transitionTask(task,S.PAUSED,{event:'pause'})}
export function resumeTask(task){return transitionTask(task,S.RUNNING,{event:'resume'})}
export function retryTask(task){
  if(![S.FAILED,S.CANCELLED].includes(task?.status))throw new Error(`task_not_retryable:${task?.status||'UNKNOWN'}`);
  return transitionTask({...copy(task),attempt:Number(task.attempt||1)+1},S.PLANNING,{event:'retry',patch:{lastError:null}});
}

export class MemoryTaskRepository{
  #rows=new Map();
  async save(task){this.#rows.set(task.id,copy(task));return copy(task)}
  async get(idValue){const row=this.#rows.get(idValue);return row?copy(row):null}
  async list(){return [...this.#rows.values()].map(copy)}
}

export class BrowserTaskRepository{
  constructor({storage,key=DEFAULT_TASK_STORAGE_KEY,limit=DEFAULT_TASK_STORAGE_LIMIT}={}){
    this.storage=safeStorage(storage);
    this.key=String(key||DEFAULT_TASK_STORAGE_KEY);
    this.limit=Math.max(10,Math.min(500,Number(limit)||DEFAULT_TASK_STORAGE_LIMIT));
    this.fallback=new MemoryTaskRepository();
  }
  async save(task){
    if(!task?.id)throw new TypeError('task_id_required');
    const persisted=taskForPersistence(task);
    if(!this.storage)return this.fallback.save(persisted);
    const rows=readPersistedRows(this.storage,this.key);
    const current=rows.find(row=>row?.id===persisted.id);
    if(current&&Number(persisted.revision||0)<Number(current.revision||0))throw new Error('task_revision_conflict');
    const next=[persisted,...rows.filter(row=>row?.id!==persisted.id)]
      .sort((a,b)=>String(b?.updatedAt||'').localeCompare(String(a?.updatedAt||'')))
      .slice(0,this.limit);
    try{writePersistedRows(this.storage,this.key,next)}catch{return this.fallback.save(persisted)}
    return copy(persisted);
  }
  async get(idValue){
    if(!this.storage)return this.fallback.get(idValue);
    const row=readPersistedRows(this.storage,this.key).find(item=>item?.id===idValue);
    return row?copy(row):null;
  }
  async list(){
    if(!this.storage)return this.fallback.list();
    return readPersistedRows(this.storage,this.key).map(copy);
  }
  async clear(){
    if(!this.storage){this.fallback=new MemoryTaskRepository();return true}
    try{this.storage.removeItem(this.key);return true}catch{return false}
  }
}

export function createPersistentTaskRepository(options={}){return new BrowserTaskRepository(options)}
export function createPersistentTaskEngine(options={}){return new TaskEngine(createPersistentTaskRepository(options))}

export class TaskEngine{
  constructor(repository=new MemoryTaskRepository()){this.repository=repository}
  async create(input){const task=createTask(input);return this.repository.save(task)}
  async get(taskId){return this.repository.get(taskId)}
  async list(){return this.repository.list()}
  async move(taskId,to,options={}){const task=await this.repository.get(taskId);if(!task)throw new Error('task_not_found');return this.repository.save(transitionTask(task,to,options))}
  async cancel(taskId,reason){const task=await this.repository.get(taskId);if(!task)throw new Error('task_not_found');return this.repository.save(cancelTask(task,reason))}
  async pause(taskId){const task=await this.repository.get(taskId);if(!task)throw new Error('task_not_found');return this.repository.save(pauseTask(task))}
  async resume(taskId){const task=await this.repository.get(taskId);if(!task)throw new Error('task_not_found');return this.repository.save(resumeTask(task))}
  async retry(taskId){const task=await this.repository.get(taskId);if(!task)throw new Error('task_not_found');return this.repository.save(retryTask(task))}
}
