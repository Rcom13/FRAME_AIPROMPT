"use client";
import { useEffect, useRef, useState } from "react";
import { classifyFrameError, type FrameError } from "./error-codes";

export default function ErrorCenter(){
  const [error,setError]=useState<FrameError|null>(null);const timer=useRef<number|null>(null);
  useEffect(()=>{
    const show=(message:string,code?:string)=>{setError(classifyFrameError(message,code));if(timer.current)window.clearTimeout(timer.current);timer.current=window.setTimeout(()=>setError(null),9000)};
    const onFrame=(event:Event)=>{const detail=(event as CustomEvent<{message?:string;code?:string}>).detail;show(detail?.message||"操作没有完成。",detail?.code)};
    const onError=(event:ErrorEvent)=>show(event.message||"页面发生未知错误。","SYS-5003");
    const onRejection=(event:PromiseRejectionEvent)=>show(event.reason instanceof Error?event.reason.message:String(event.reason||"异步任务失败。"),"SYS-5003");
    const originalFetch=window.fetch.bind(window);window.fetch=async(...args)=>{try{const response=await originalFetch(...args);if(!response.ok){void response.clone().json().then(data=>show(data?.error||`请求失败 (${response.status})`,data?.code)).catch(()=>show(`请求失败 (${response.status})`,response.status===429?"REQ-3003":"SYS-5002"))}return response}catch(cause){show(cause instanceof Error?cause.message:"网络连接失败。","SYS-5001");throw cause}};
    window.addEventListener("frame:error",onFrame);window.addEventListener("error",onError);window.addEventListener("unhandledrejection",onRejection);return()=>{window.fetch=originalFetch;window.removeEventListener("frame:error",onFrame);window.removeEventListener("error",onError);window.removeEventListener("unhandledrejection",onRejection);if(timer.current)window.clearTimeout(timer.current)};
  },[]);
  if(!error)return null;return <aside className="global-error-center" role="alert" aria-live="assertive"><span className="error-code">{error.code}</span><div><b>{error.title}</b><p>{error.message}</p></div><button onClick={()=>setError(null)} aria-label="关闭错误提示">×</button></aside>
}
