export function normalizeApiUrl(value) {
  let url; try { url = new URL(value); } catch { throw new Error('Compiler API URL is invalid'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Compiler API must use HTTP or HTTPS');
  return url.toString().replace(/\/$/, '');
}

export function compileRequest({ source, fileName, contractName, optimizerEnabled = true, optimizerRuns = 200 }) {
  if (typeof source !== 'string' || !source.trim()) throw new Error('Solidity source is required');
  if (!/^[A-Za-z0-9_.-]+\.sol$/.test(fileName || '')) throw new Error('Filename must be a safe .sol filename');
  if (contractName && !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(contractName)) throw new Error('Contract name is not a valid Solidity identifier');
  const runs = Number(optimizerRuns); if (!Number.isInteger(runs) || runs < 1 || runs > 1_000_000) throw new Error('Optimizer runs must be from 1 to 1,000,000');
  return { source, fileName, ...(contractName ? { contractName } : {}), optimizer: { enabled: Boolean(optimizerEnabled), runs } };
}

export class CompilerApi {
  constructor(baseUrl, fetchImpl = globalThis.fetch) { this.baseUrl = normalizeApiUrl(baseUrl); this.fetch = fetchImpl.bind(globalThis); }
  async request(path, options = {}) {
    const response = await this.fetch(`${this.baseUrl}${path}`, { ...options, headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...options.headers } });
    let payload; try { payload = await response.json(); } catch { throw new Error(`Compiler API returned non-JSON HTTP ${response.status}`); }
    if (!response.ok) { const error = new Error(payload.error || `Compiler API returned HTTP ${response.status}`); error.status = response.status; error.diagnostics = payload.diagnostics || []; throw error; }
    return payload;
  }
  health() { return this.request('/health'); }
  metrics() { return this.request('/api/metrics'); }
  async compile(input) { return (await this.request('/api/compile', { method: 'POST', body: JSON.stringify(input) })).result; }
  async queue(input) { return (await this.request('/api/jobs', { method: 'POST', body: JSON.stringify(input) })).job; }
  async job(id) { return (await this.request(`/api/jobs/${encodeURIComponent(id)}`)).job; }
  async jobs(limit = 20) { return (await this.request(`/api/jobs?limit=${Math.min(100, Math.max(1, Number(limit) || 20))}`)).jobs; }
  async waitForJob(id, { interval = 100, timeout = 30000, signal } = {}) {
    const started = Date.now();
    while (true) {
      if (signal?.aborted) throw new Error('Job wait cancelled');
      const job = await this.job(id); if (job.status === 'completed' || job.status === 'failed') return job;
      if (Date.now() - started >= timeout) throw new Error(`Compilation job timed out after ${timeout}ms`);
      await new Promise((resolve, reject) => { const timer = setTimeout(resolve, interval); signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('Job wait cancelled')); }, { once: true }); });
    }
  }
}

export function artifactBundle(result) {
  if (!result?.contracts?.length) throw new Error('No compiled contracts are available');
  return { compiler: result.compiler, sourceHash: result.sourceHash, optimizer: result.optimizer, contracts: result.contracts.map(contract => ({ fileName: contract.fileName, name: contract.name, abi: contract.abi, bytecode: contract.bytecode, deployedBytecode: contract.deployedBytecode, metadata: contract.metadata })) };
}
