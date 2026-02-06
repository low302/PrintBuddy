import { useEffect, useMemo, useState } from "react";
import ThreeViewer from "./components/ThreeViewer.jsx";
import { Badge } from "./components/ui/badge.jsx";
import { Button } from "./components/ui/button.jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card.jsx";
import { Input } from "./components/ui/input.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const sidebarItems = [
  { label: "Library", id: "library" },
  { label: "Uploads", id: "uploads" },
  { label: "Tags", id: "tags" },
  { label: "Reports", id: "reports" },
];

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function App() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredFiles = useMemo(() => {
    if (statusFilter === "all") return files;
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
      console.error("Failed to load files", error);
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
    body.append("file", fileInput.files[0]);

    try {
      const response = await fetch(`${API_BASE}/api/files`, {
        method: "POST",
        body,
      });
      if (!response.ok) throw new Error("Upload failed");
      setIsUploadOpen(false);
      form.reset();
      await loadFiles();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Delete ${file.original_name}?`)) return;
    await fetch(`${API_BASE}/api/files/${file.id}`, { method: "DELETE" });
    if (selectedFile?.id === file.id) {
      setSelectedFile(null);
    }
    await loadFiles();
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(30,41,59,0.6),_rgba(2,6,23,1)_55%)] text-foreground">
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

        <aside className="hidden w-64 flex-col border-r border-border bg-card/80 backdrop-blur md:flex">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-foreground">PrintBuddy Storage</p>
              <p className="text-xs text-muted-foreground">Local STL / 3MF vault</p>
            </div>
            <Button variant="outline" size="icon" aria-label="Collapse">
              <ChevronIcon />
            </Button>
          </div>
          <div className="px-5 py-4">
            <div className="relative">
              <Input className="pl-9" placeholder="Search files" />
              <div className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground">
                <SearchIcon />
              </div>
            </div>
          </div>
          <div className="px-5 pb-4">
            <Button className="w-full" onClick={() => setIsUploadOpen(true)}>
              <PlusIcon />
              <span className="ml-2">Upload Model</span>
            </Button>
          </div>
          <div className="px-5 pb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filters</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["all", "stl", "3mf"].map((filter) => (
                <Button
                  key={filter}
                  size="sm"
                  variant={statusFilter === filter ? "default" : "outline"}
                  className="h-7 rounded-full px-3 text-[11px] uppercase"
                  onClick={() => setStatusFilter(filter)}
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>
          <div className="px-5 pb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saved Searches</p>
            <div className="mt-3 space-y-2">
              {["Recent uploads", "High poly", "Production ready"].map((label) => (
                <button
                  key={label}
                  className="w-full rounded-lg border border-border/80 bg-background/30 px-3 py-2 text-left text-xs text-muted-foreground transition hover:bg-accent/40"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="flex items-center justify-between border-b border-border bg-card/70 px-6 py-4 backdrop-blur md:hidden">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => setIsMobileNavOpen(true)} aria-label="Open menu">
                <MenuIcon />
              </Button>
              <div>
                <p className="text-sm font-semibold text-foreground">PrintBuddy Storage</p>
                <p className="text-xs text-muted-foreground">Local STL / 3MF vault</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setIsUploadOpen(true)}>
              Upload
            </Button>
          </div>

          <header className="border-b border-border bg-card/60 px-6 py-5 backdrop-blur">
            <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Model Library</h1>
                <p className="text-sm text-muted-foreground">
                  {files.length} total assets · {filteredFiles.length} matching filters
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">Manage Tags</Button>
                <Button onClick={() => setIsUploadOpen(true)}>
                  <UploadIcon />
                  <span className="ml-2">Upload</span>
                </Button>
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1560px] px-6 pb-10 pt-6">
            <div className="grid gap-6 xl:min-h-[calc(100vh-220px)] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] xl:items-stretch">
              <Card className="flex h-full flex-col">
                <CardHeader className="flex-row items-start justify-between space-y-0 border-b border-border pb-4">
                  <div>
                    <CardTitle>Inventory</CardTitle>
                    <CardDescription>STL and 3MF assets stored locally</CardDescription>
                  </div>
                  <Button variant="secondary" size="sm">
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 pt-4">
                  <div className="h-full overflow-auto rounded-lg border border-border/70">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">File</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Added</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading && (
                          <TableRow>
                            <TableCell className="py-6 text-muted-foreground" colSpan={5}>
                              Loading files...
                            </TableCell>
                          </TableRow>
                        )}
                        {!isLoading && filteredFiles.length === 0 && (
                          <TableRow>
                            <TableCell className="py-8 text-muted-foreground" colSpan={5}>
                              No files yet. Upload a STL or 3MF to begin.
                            </TableCell>
                          </TableRow>
                        )}
                        {filteredFiles.map((file) => (
                          <TableRow key={file.id}>
                            <TableCell className="pl-4">
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">{file.original_name}</span>
                                <span className="text-xs text-muted-foreground">{file.id}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="muted" className="uppercase">
                                {file.extension}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{formatBytes(file.size)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(file.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => setSelectedFile(file)}>
                                  View
                                </Button>
                                <Button size="sm" variant="outline" asChild>
                                  <a href={`${API_BASE}/api/files/${file.id}/file`}>Download</a>
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleDelete(file)}>
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card className="flex h-full flex-col">
                <CardHeader className="flex-row items-start justify-between space-y-0 border-b border-border pb-4">
                  <div>
                    <CardTitle>3D Preview</CardTitle>
                    <CardDescription>Orbit, zoom, and inspect geometry</CardDescription>
                  </div>
                  {selectedFile && (
                    <Badge variant="secondary" className="uppercase">
                      {selectedFile.extension}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="flex-1 pt-4">
                  {selectedFile ? (
                    <ThreeViewer
                      fileUrl={`${API_BASE}/api/files/${selectedFile.id}/file`}
                      extension={selectedFile.extension}
                      className="h-full min-h-[360px]"
                    />
                  ) : (
                    <div className="flex h-full min-h-[360px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                      Select a file to preview
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-xl">
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Upload STL or 3MF</CardTitle>
                <CardDescription>Files are stored locally in your server vault.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsUploadOpen(false)}>
                Close
              </Button>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleUpload}>
                <div>
                  <label className="text-sm font-medium text-foreground">Model File</label>
                  <Input name="file" type="file" accept=".stl,.3mf" className="mt-2" required />
                </div>
                <div className="rounded-lg border border-dashed border-border/80 bg-muted/40 p-4 text-xs text-muted-foreground">
                  Accepted: STL, 3MF. Larger models may take longer to preview.
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Upload File</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {isMobileNavOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden">
          <div className="absolute inset-y-0 left-0 w-72 bg-card shadow-soft">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">PrintBuddy Storage</p>
                <p className="text-xs text-muted-foreground">Local STL / 3MF vault</p>
              </div>
              <Button variant="outline" size="icon" onClick={() => setIsMobileNavOpen(false)} aria-label="Close menu">
                <CloseIcon />
              </Button>
            </div>
            <div className="px-5 py-4">
              <Button className="w-full" onClick={() => setIsUploadOpen(true)}>
                <PlusIcon />
                <span className="ml-2">Upload Model</span>
              </Button>
            </div>
            <div className="px-5 pb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filters</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["all", "stl", "3mf"].map((filter) => (
                  <Button
                    key={filter}
                    size="sm"
                    variant={statusFilter === filter ? "default" : "outline"}
                    className="h-7 rounded-full px-3 text-[11px] uppercase"
                    onClick={() => setStatusFilter(filter)}
                  >
                    {filter}
                  </Button>
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
