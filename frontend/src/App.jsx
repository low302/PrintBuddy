import { useEffect, useMemo, useState } from 'react';
import ThreeViewer from './components/ThreeViewer.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const sidebarItems = [
  { label: 'Library', id: 'library' },
  { label: 'Uploads', id: 'uploads' },
  { label: 'Tags', id: 'tags' },
  { label: 'Reports', id: 'reports' }
];

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function App() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredFiles = useMemo(() => {
    if (statusFilter === 'all') return files;
    return files.filter((file) => file.extension === statusFilter);
  }, [files, statusFilter]);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/files`);
      const data = await response.json();
      setFiles(data.items);
      if (data.items.length && !selectedFile) {
        setSelectedFile(data.items[0]);
      }
    } catch (error) {
      console.error('Failed to load files', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleUpload = async (event) => {
    event.preventDefault();
    const form = event.target;
    const fileInput = form.elements.file;
    if (!fileInput.files[0]) return;

    const body = new FormData();
    body.append('file', fileInput.files[0]);

    try {
      const response = await fetch(`${API_BASE}/api/files`, {
        method: 'POST',
        body
      });
      if (!response.ok) throw new Error('Upload failed');
      setIsUploadOpen(false);
      form.reset();
      await loadFiles();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Delete ${file.original_name}?`)) return;
    await fetch(`${API_BASE}/api/files/${file.id}`, { method: 'DELETE' });
    if (selectedFile?.id === file.id) {
      setSelectedFile(null);
    }
    await loadFiles();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-16 flex-col items-center border-r border-neutral-800 bg-black py-6 text-white md:flex">
          <div className="mb-10 flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
            PB
          </div>
          <nav className="flex flex-1 flex-col items-center gap-5">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-200 transition-colors hover:bg-white/10"
                aria-label={item.label}
              >
                <IconSquare />
              </button>
            ))}
          </nav>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs">ZA</div>
        </aside>

        <aside className="hidden w-64 flex-col border-r border-slate-800 bg-slate-900 md:flex">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-100">PrintBuddy Storage</p>
              <p className="text-xs text-slate-400">Local STL / 3MF vault</p>
            </div>
            <button className="btn btn-outline h-8 w-8 p-0" aria-label="Collapse">
              <ChevronIcon />
            </button>
          </div>
          <div className="px-5 py-4">
            <div className="relative">
              <input className="input pl-9" placeholder="Search files" />
              <div className="pointer-events-none absolute left-3 top-2.5 text-slate-500">
                <SearchIcon />
              </div>
            </div>
          </div>
          <div className="px-5 pb-4">
            <button className="btn btn-primary w-full" onClick={() => setIsUploadOpen(true)}>
              <PlusIcon />
              <span className="ml-2">Upload Model</span>
            </button>
          </div>
          <div className="px-5 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Filters</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {['all', 'stl', '3mf'].map((filter) => (
                <button
                  key={filter}
                  className={`badge ${statusFilter === filter ? 'border-slate-100 bg-slate-100 text-slate-900' : 'border-slate-700 text-slate-300'}`}
                  onClick={() => setStatusFilter(filter)}
                >
                  {filter.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="px-5 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Saved Searches</p>
            <div className="mt-3 space-y-2">
              <div className="rounded-lg border border-slate-800 px-3 py-2 text-xs text-slate-300">Recent uploads</div>
              <div className="rounded-lg border border-slate-800 px-3 py-2 text-xs text-slate-300">High poly</div>
              <div className="rounded-lg border border-slate-800 px-3 py-2 text-xs text-slate-300">Production ready</div>
            </div>
          </div>
        </aside>

        <main className="flex-1">
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4 md:hidden">
            <div className="flex items-center gap-3">
              <button className="btn btn-outline h-9 w-9 p-0" onClick={() => setIsMobileNavOpen(true)} aria-label="Open menu">
                <MenuIcon />
              </button>
              <div>
                <p className="text-sm font-semibold text-slate-100">PrintBuddy Storage</p>
                <p className="text-xs text-slate-400">Local STL / 3MF vault</p>
              </div>
            </div>
            <button className="btn btn-primary h-9 px-3 text-xs" onClick={() => setIsUploadOpen(true)}>
              Upload
            </button>
          </div>
          <header className="border-b border-slate-800 bg-slate-900 px-6 py-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-100">Model Library</h1>
                <p className="text-sm text-slate-400">
                  {files.length} total assets · {filteredFiles.length} matching filters
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-outline">Manage Tags</button>
                <button className="btn btn-primary" onClick={() => setIsUploadOpen(true)}>
                  <UploadIcon />
                  <span className="ml-2">Upload</span>
                </button>
              </div>
            </div>
          </header>

          <div className="grid gap-6 p-6 xl:grid-cols-[1.2fr_1fr]">
            <section className="card p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Inventory</p>
                  <p className="text-xs text-slate-400">STL and 3MF assets stored locally</p>
                </div>
                <button className="btn btn-secondary">Export CSV</button>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-400">
                    <tr>
                      <th className="py-2 pr-4">File</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Size</th>
                      <th className="py-2 pr-4">Added</th>
                      <th className="py-2 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && (
                      <tr>
                        <td className="py-4 text-slate-400" colSpan="5">
                          Loading files...
                        </td>
                      </tr>
                    )}
                    {!isLoading && filteredFiles.length === 0 && (
                      <tr>
                        <td className="py-6 text-slate-400" colSpan="5">
                          No files yet. Upload a STL or 3MF to begin.
                        </td>
                      </tr>
                    )}
                    {filteredFiles.map((file) => (
                      <tr key={file.id} className="table-row border-t border-slate-800">
                        <td className="py-3 pr-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-100">{file.original_name}</span>
                            <span className="text-xs text-slate-400">{file.id}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`badge ${file.extension === 'stl' ? 'border-slate-700 bg-slate-800 text-slate-200' : 'border-slate-700 bg-slate-900 text-slate-200'}`}>
                            {file.extension.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-300">{formatBytes(file.size)}</td>
                        <td className="py-3 pr-4 text-slate-300">{new Date(file.created_at).toLocaleDateString()}</td>
                        <td className="py-3 pr-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button className="btn btn-outline" onClick={() => setSelectedFile(file)}>
                              View
                            </button>
                            <a className="btn btn-outline" href={`${API_BASE}/api/files/${file.id}/file`}>
                              Download
                            </a>
                            <button className="btn btn-outline" onClick={() => handleDelete(file)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">3D Preview</p>
                  <p className="text-xs text-slate-400">Orbit, zoom, and inspect geometry</p>
                </div>
                {selectedFile && (
                  <span className="badge border-slate-700 bg-slate-800 text-slate-200">
                    {selectedFile.extension.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="mt-4">
                {selectedFile ? (
                  <ThreeViewer
                    fileUrl={`${API_BASE}/api/files/${selectedFile.id}/file`}
                    extension={selectedFile.extension}
                  />
                ) : (
                  <div className="flex h-[360px] items-center justify-center rounded-lg border border-dashed border-slate-800 text-sm text-slate-400">
                    Select a file to preview
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="card w-full max-w-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Upload STL or 3MF</h2>
                <p className="text-sm text-slate-400">Files are stored locally in your server vault.</p>
              </div>
              <button className="btn btn-outline" onClick={() => setIsUploadOpen(false)}>
                Close
              </button>
            </div>
            <form className="mt-4 space-y-4" onSubmit={handleUpload}>
              <div>
                <label className="text-sm font-medium text-slate-300">Model File</label>
                <input name="file" type="file" accept=".stl,.3mf" className="input mt-2" required />
              </div>
              <div className="rounded-lg border border-dashed border-slate-800 p-4 text-xs text-slate-400">
                Accepted: STL, 3MF. Larger models may take longer to preview.
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-outline" onClick={() => setIsUploadOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Upload File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMobileNavOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden">
          <div className="absolute inset-y-0 left-0 w-72 bg-slate-900 shadow-soft">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-100">PrintBuddy Storage</p>
                <p className="text-xs text-slate-400">Local STL / 3MF vault</p>
              </div>
              <button className="btn btn-outline h-8 w-8 p-0" onClick={() => setIsMobileNavOpen(false)} aria-label="Close menu">
                <CloseIcon />
              </button>
            </div>
            <div className="px-5 py-4">
              <button className="btn btn-primary w-full" onClick={() => setIsUploadOpen(true)}>
                <PlusIcon />
                <span className="ml-2">Upload Model</span>
              </button>
            </div>
            <div className="px-5 pb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Filters</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {['all', 'stl', '3mf'].map((filter) => (
                  <button
                    key={filter}
                    className={`badge ${statusFilter === filter ? 'border-slate-100 bg-slate-100 text-slate-900' : 'border-slate-700 text-slate-300'}`}
                    onClick={() => setStatusFilter(filter)}
                  >
                    {filter.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IconSquare() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="4" width="16" height="16" rx="3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-3.5-3.5" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}
