import worker from '../src/worker.js';

class MockDB {
  constructor(){ this.rows = new Map(); }
  async exec(){ return {}; }
  prepare(sql){
    const db=this;
    return {
      params: [],
      bind(...params){ this.params=params; return this; },
      async run(){
        if (sql.includes('INSERT INTO inquiries')) {
          const [id, created_at, name, city, contact, email, project_type, message, language, consent, photo_keys, source, user_agent] = this.params;
          db.rows.set(id,{id,created_at,name,city,contact,email,project_type,message,language,consent,status:'new',photo_keys,source,user_agent});
          return {meta:{changes:1}};
        }
        if (sql.includes('UPDATE inquiries SET status')) {
          const [status,id]=this.params;
          const row=db.rows.get(id);
          if(!row) return {meta:{changes:0}};
          row.status=status;
          return {meta:{changes:1}};
        }
        throw new Error('Unhandled run SQL: '+sql);
      },
      async all(){
        let rows=[...db.rows.values()];
        if (sql.includes('WHERE status = ?')) rows=rows.filter(r=>r.status===this.params[0]);
        rows.sort((a,b)=>b.created_at.localeCompare(a.created_at));
        return {results:rows};
      },
      async first(){
        const id=this.params[0];
        const row=db.rows.get(id);
        if(!row) return null;
        if (sql.includes('SELECT photo_keys')) return {photo_keys:row.photo_keys};
        return row;
      }
    };
  }
}

class MockR2Object {
  constructor(body,meta){this._body=body;this.httpMetadata=meta?.httpMetadata||{};}
  get body(){return this._body.stream();}
  writeHttpMetadata(headers){if(this.httpMetadata.contentType) headers.set('content-type',this.httpMetadata.contentType);}
}
class MockR2 {
  constructor(){this.map=new Map();}
  async put(key,stream,meta){const bytes=await new Response(stream).blob(); this.map.set(key,{bytes,meta});}
  async get(key){const entry=this.map.get(key); return entry?new MockR2Object(entry.bytes,entry.meta):null;}
  async delete(key){this.map.delete(key);}
}

const DB=new MockDB();
const MEDIA=new MockR2();
const waits=[];
const env={DB,MEDIA,ADMIN_API_TOKEN:'test-admin-token-123456789',MAX_UPLOAD_MB:'8',WHATSAPP_ENABLED:'false'};
const ctx={waitUntil(p){waits.push(Promise.resolve(p));}};

const form=new FormData();
form.set('name','测试客户');
form.set('city','Den Haag');
form.set('contact','+31612345678');
form.set('email','client@example.com');
form.set('type','wardrobe');
form.set('message','想做一整面墙的衣柜');
form.set('lang','zh');
form.set('consent','yes');
form.append('photos',new File([new Uint8Array([1,2,3,4])],'room.jpg',{type:'image/jpeg'}));

const post=await worker.fetch(new Request('https://kaida.test/api/inquiries',{method:'POST',body:form}),env,ctx);
if(post.status!==201) throw new Error('POST failed '+post.status+' '+await post.text());
const created=await post.json();
await Promise.all(waits);
if(!created.ok||!created.inquiryId) throw new Error('Missing inquiry id');

const auth={'Authorization':'Bearer test-admin-token-123456789'};
const list=await worker.fetch(new Request('https://kaida.test/api/inquiries',{headers:auth}),env,ctx);
const listBody=await list.json();
if(list.status!==200||listBody.items.length!==1) throw new Error('List failed');
if(listBody.items[0].photoCount!==1) throw new Error('Photo count failed');

const photo=await worker.fetch(new Request(`https://kaida.test/api/inquiries/${created.inquiryId}/photos/0`,{headers:auth}),env,ctx);
if(photo.status!==200||photo.headers.get('content-type')!=='image/jpeg') throw new Error('Photo fetch failed');

const patch=await worker.fetch(new Request(`https://kaida.test/api/inquiries/${created.inquiryId}`,{method:'PATCH',headers:{...auth,'content-type':'application/json'},body:JSON.stringify({status:'contacted'})}),env,ctx);
const patchBody=await patch.json();
if(patch.status!==200||patchBody.status!=='contacted') throw new Error('Patch failed');

const previousConsoleError=console.error;
console.error=()=>{};
const unauth=await worker.fetch(new Request('https://kaida.test/api/inquiries'),env,ctx);
console.error=previousConsoleError;
if(unauth.status!==401) throw new Error('Admin protection failed');

console.log('Kaida integration smoke passed:', JSON.stringify({listCount:listBody.items.length,photoStatus:photo.status,newStatus:patchBody.status,unauthorizedStatus:unauth.status}));
