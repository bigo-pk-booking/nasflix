export async function onRequest({request,env,params}){
  if(request.method!=="GET")return new Response("Method not allowed",{status:405});
  if(!env.MEDIA_BUCKET)return new Response("Media storage is not configured",{status:503});
  const key=decodeURIComponent(params.key||"");
  if(!key||key.includes(".."))return new Response("Not found",{status:404});
  const object=await env.MEDIA_BUCKET.get(key);
  if(!object)return new Response("Not found",{status:404});
  const headers=new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag",object.httpEtag);
  headers.set("x-content-type-options","nosniff");
  headers.set("cache-control","public, max-age=3600");
  return new Response(object.body,{headers});
}
