import { useEffect, useMemo, useState } from 'react';
import { artifactBundle, CompilerApi, compileRequest } from './api.js';
import './App.css';

const SAMPLE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Counter {
    uint256 public count;
    event Incremented(uint256 value);

    function increment() external {
        count += 1;
        emit Incremented(count);
    }
}`;
export default function App() {
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('solidityapi:url') || 'http://localhost:3000');
  const [source, setSource] = useState(SAMPLE); const [fileName, setFileName] = useState('Counter.sol'); const [contractName, setContractName] = useState('Counter');
  const [runs, setRuns] = useState(200); const [queued, setQueued] = useState(false); const [health, setHealth] = useState(null);
  const [result, setResult] = useState(null); const [diagnostics, setDiagnostics] = useState([]); const [selected, setSelected] = useState(0); const [view, setView] = useState('abi');
  const [status, setStatus] = useState({ type: 'idle', text: 'Connect to SolidityStackDiamond, then compile.' }); const [busy, setBusy] = useState(false);
  const api = useMemo(() => { try { return new CompilerApi(apiUrl); } catch { return null; } }, [apiUrl]); const contract = result?.contracts?.[selected];
  useEffect(() => { localStorage.setItem('solidityapi:url', apiUrl); }, [apiUrl]);

  async function checkHealth() { if (!api) { setStatus({ type: 'error', text: 'Compiler API URL is invalid.' }); return; } try { const data = await api.health(); setHealth(data); setStatus({ type: 'success', text: `Connected to ${data.service} · ${data.compiler}` }); } catch (error) { setHealth(null); setStatus({ type: 'error', text: error.message }); } }
  async function compile() {
    if (!api) return setStatus({ type: 'error', text: 'Compiler API URL is invalid.' }); setBusy(true); setResult(null); setDiagnostics([]);
    try {
      const input = compileRequest({ source, fileName, contractName, optimizerRuns: runs }); let output;
      if (queued) { const job = await api.queue(input); setStatus({ type: 'pending', text: `Job ${job.id} queued. Waiting for a worker…` }); const finished = await api.waitForJob(job.id); if (finished.status === 'failed') { const error = new Error(finished.error?.message || 'Queued compilation failed'); error.diagnostics = finished.error?.diagnostics || []; throw error; } output = finished.result; }
      else output = await api.compile(input);
      setResult(output); setDiagnostics(output.diagnostics || []); setSelected(0); setStatus({ type: 'success', text: `Compiled ${output.contracts.length} contract${output.contracts.length === 1 ? '' : 's'} with ${output.compiler}.` });
    } catch (error) { setDiagnostics(error.diagnostics || []); setStatus({ type: 'error', text: error.message }); } finally { setBusy(false); }
  }
  function download() { const data = JSON.stringify(artifactBundle(result), null, 2); const url = URL.createObjectURL(new Blob([data], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${contract?.name || 'solidity'}-artifacts.json`; anchor.click(); URL.revokeObjectURL(url); }
  const shown = contract ? view === 'abi' ? JSON.stringify(contract.abi, null, 2) : view === 'bytecode' ? contract.bytecode : view === 'runtime' ? contract.deployedBytecode : JSON.stringify(contract.metadata, null, 2) : '';
  return <div className="app"><header><div className="brand">SOLIDITY<span>API+</span></div><div className={`connection ${health?'online':''}`}><i/>{health?`ONLINE · ${health.compiler}`:'NOT CONNECTED'}</div><button onClick={checkHealth}>Test connection</button></header><main><section className="hero"><div><span className="eyebrow">SOLIDITY BUILD CONSOLE</span><h1>Source in.<br/><em>Artifacts out.</em></h1></div><div className="api"><label>Compiler API URL<input value={apiUrl} onChange={event=>setApiUrl(event.target.value)} spellCheck="false"/></label></div></section>
    <div className="workspace"><section className="panel editor"><div className="panel-title"><b>01</b><h2>Source</h2><span>{source.split('\n').length} lines</span></div><div className="fields"><label>Filename<input value={fileName} onChange={event=>setFileName(event.target.value)}/></label><label>Contract filter<input value={contractName} onChange={event=>setContractName(event.target.value)} placeholder="Optional"/></label><label>Optimizer runs<input type="number" value={runs} onChange={event=>setRuns(event.target.value)}/></label></div><textarea value={source} onChange={event=>setSource(event.target.value)} spellCheck="false"/><div className="compile-row"><label className="toggle"><input type="checkbox" checked={queued} onChange={event=>setQueued(event.target.checked)}/><span/>Queue as background job</label><button className="primary" onClick={compile} disabled={busy}>{busy?'Compiling…':queued?'Queue compilation':'Compile now'}</button></div></section>
      <section className="panel output"><div className="panel-title"><b>02</b><h2>Artifacts</h2>{result&&<button className="text" onClick={download}>Download JSON</button>}</div>{!contract?<div className="empty">Compiled ABI, creation bytecode, runtime bytecode, and metadata appear here.</div>:<><div className="contract-tabs">{result.contracts.map((item,index)=><button className={index===selected?'active':''} key={`${item.fileName}:${item.name}`} onClick={()=>setSelected(index)}>{item.name}</button>)}</div><div className="view-tabs">{['abi','bytecode','runtime','metadata'].map(name=><button className={view===name?'active':''} onClick={()=>setView(name)} key={name}>{name}</button>)}</div><pre>{shown}</pre><div className="artifact-meta"><span>Source</span><b>{result.sourceHash}</b><span>Creation bytes</span><b>{Math.max(0,(contract.bytecode.length-2)/2).toLocaleString()}</b></div></>}</section></div>
    {diagnostics.length>0&&<section className="diagnostics"><h2>Compiler diagnostics</h2>{diagnostics.map((item,index)=><div className={item.severity} key={index}><b>{item.severity}</b><pre>{item.formattedMessage||item.message}</pre></div>)}</section>}<section className={`status ${status.type}`}><i/><pre>{status.text}</pre></section></main></div>;
}
