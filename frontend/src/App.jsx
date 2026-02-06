import { useEffect, useMemo, useState } from "react";
import ThreeViewer from "./components/ThreeViewer.jsx";
import ModelThumbnail from "./components/ModelThumbnail.jsx";
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
  { label: "Models", id: "models" },
  { label: "Tags", id: "tags" },
  { label: "Reports", id: "reports" },
];

const TAG_PRESETS = [
  "bracket",
  "enclosure",
  "fixture",
  "prototype",
  "production",
  "mount",
  "jig",
  "tooling",
  "adapter",
  "cover",
];

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function escapeCsv(value) {
  const stringValue = String(value ?? "");
  if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export default function App() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isTagEditorOpen, setIsTagEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [activePage, setActivePage] = useState("library");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [tagDraft, setTagDraft] = useState("");
  const [bulkTagDraft, setBulkTagDraft] = useState("");
  const [bulkMode, setBulkMode] = useState("add");
  const [isBulkTagOpen, setIsBulkTagOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const pageTitles = {
    library: "Model Library",
    models: "Models",
    tags: "Tags",
    reports: "Reports",
  };

  const allTags = useMemo(() => {
    const tags = new Set();
    files.forEach((file) => {
      (file.tags || []).forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [files]);

  const quickTags = useMemo(() => {
    const dynamic = allTags.slice(0, 6);
    const presets = TAG_PRESETS.filter((tag) => !dynamic.includes(tag)).slice(0, 6 - dynamic.length);
    return [...dynamic, ...presets];
  }, [allTags]);

  const filteredFiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return files.filter((file) => {
      const matchesType = statusFilter === "all" || file.extension === statusFilter;
      const matchesTag = tagFilter === "all" || (file.tags || []).includes(tagFilter);
      const matchesQuery =
        !query ||
        file.original_name.toLowerCase().includes(query) ||
        file.id.toLowerCase().includes(query) ||
        (file.tags || []).some((tag) => tag.toLowerCase().includes(query));
      return matchesType && matchesTag && matchesQuery;
    });
  }, [files, searchQuery, statusFilter, tagFilter]);

  useEffect(() => {
    if (selectedFile && filteredFiles.find((file) => file.id === selectedFile.id)) {
      return;
    }
    setSelectedFile(filteredFiles[0] || null);
  }, [filteredFiles, selectedFile]);

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
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(file.id);
      return next;
    });
    await loadFiles();
  };

  const handleExportCsv = () => {
    const headers = ["id", "original_name", "extension", "size", "created_at", "tags"];
    const rows = filteredFiles.map((file) => [
      file.id,
      file.original_name,
      file.extension,
      file.size,
      file.created_at,
      (file.tags || []).join(";")
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `printbuddy-uploads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const openTagEditor = (file) => {
    if (!file) return;
    setSelectedFile(file);
    setTagDraft((file.tags || []).join(", "));
    setIsTagEditorOpen(true);
  };

  const parseTags = (value) => {
    const tags = value
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);
    return Array.from(new Set(tags));
  };

  const handleSaveTags = async () => {
    if (!selectedFile) return;
    const tags = parseTags(tagDraft);
    const response = await fetch(`${API_BASE}/api/files/${selectedFile.id}/tags`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    });
    if (!response.ok) return;
    const data = await response.json();
    setFiles((prev) => prev.map((file) => (file.id === data.item.id ? data.item : file)));
    setSelectedFile(data.item);
    setIsTagEditorOpen(false);
  };

  const handleAutoTag = async (file) => {
    if (!file) return;
    const response = await fetch(`${API_BASE}/api/files/${file.id}/autotag`, { method: "POST" });
    if (!response.ok) return;
    const data = await response.json();
    setFiles((prev) => prev.map((entry) => (entry.id === data.item.id ? data.item : entry)));
    setSelectedFile(data.item);
  };

  const handlePreview = (file) => {
    setSelectedFile(file);
    setIsPreviewOpen(true);
  };

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const applyBulkTags = async ({ mode }) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const tags = parseTags(bulkTagDraft);

    await Promise.all(
      ids.map(async (id) => {
        const file = files.find((entry) => entry.id === id);
        if (!file) return;
        let nextTags = [];
        if (mode === "clear") {
          nextTags = [];
        } else if (mode === "replace") {
          nextTags = tags;
        } else {
          const existing = file.tags || [];
          nextTags = Array.from(new Set([...existing, ...tags]));
        }
        await fetch(`${API_BASE}/api/files/${id}/tags`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: nextTags }),
        });
      })
    );

    setIsBulkTagOpen(false);
    setBulkTagDraft("");
    await loadFiles();
  };

  const appendPresetTag = (tag) => {
    setBulkTagDraft((prev) => {
      const existing = parseTags(prev);
      const next = Array.from(new Set([...existing, tag]));
      return next.join(", ");
    });
  };

  const applyPresetToSelection = (tag) => {
    if (selectedIds.size === 0) return;
    appendPresetTag(tag);
    setBulkMode("add");
    setIsBulkTagOpen(true);
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
                className={`flex h-10 w-10 items-center justify-center rounded-lg text-neutral-200 transition-colors hover:bg-white/10 ${
                  activePage === item.id ? "bg-white/15 text-white" : ""
                }`}
                onClick={() => setActivePage(item.id)}
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
              <Input
                className="pl-9"
                placeholder="Search files"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
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
          <div className="px-5 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sections</p>
            <div className="mt-3 space-y-2">
              {sidebarItems.slice(0, 2).map((item) => (
                <button
                  key={item.id}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${
                    activePage === item.id
                      ? "border-border bg-accent/60 text-foreground"
                      : "border-border/80 bg-background/30 text-muted-foreground hover:bg-accent/40"
                  }`}
                  onClick={() => setActivePage(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
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
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{pageTitles[activePage] || "Model Library"}</h1>
                <p className="text-sm text-muted-foreground">
                  {files.length} total assets · {filteredFiles.length} matching filters
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => openTagEditor(selectedFile)}>
                  Manage Tags
                </Button>
                <Button onClick={() => setIsUploadOpen(true)}>
                  <UploadIcon />
                  <span className="ml-2">Upload</span>
                </Button>
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1560px] px-6 pb-10 pt-6">
            {activePage === "library" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader className="flex-row items-start justify-between space-y-0 border-b border-border pb-4">
                    <div>
                      <CardTitle>Selected Preview</CardTitle>
                      <CardDescription>Quick look at the selected model</CardDescription>
                    </div>
                    {selectedFile ? (
                      <Badge variant="secondary" className="uppercase">
                        {selectedFile.extension}
                      </Badge>
                    ) : null}
                  </CardHeader>
                  <CardContent className="pt-4">
                    {selectedFile ? (
                      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                        <ThreeViewer
                          fileUrl={`${API_BASE}/api/files/${selectedFile.id}/file`}
                          extension={selectedFile.extension}
                          className="h-[200px]"
                        />
                        <div className="flex flex-col justify-between gap-4">
                          <div>
                            <p className="text-lg font-semibold text-foreground">{selectedFile.original_name}</p>
                            <p className="text-xs text-muted-foreground">{selectedFile.id}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {(selectedFile.tags || []).length === 0 ? (
                                <span className="text-xs text-muted-foreground">No tags yet</span>
                              ) : (
                                selectedFile.tags.map((tag) => (
                                  <Badge key={tag} variant="muted">
                                    {tag}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </div>
                          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                            <div>
                              <p className="text-xs uppercase text-muted-foreground">Size</p>
                              <p className="text-foreground">{formatBytes(selectedFile.size)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase text-muted-foreground">Added</p>
                              <p className="text-foreground">
                                {new Date(selectedFile.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => openTagEditor(selectedFile)}>
                              Edit Tags
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => handleAutoTag(selectedFile)}>
                              Auto Tag
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <a href={`${API_BASE}/api/files/${selectedFile.id}/file`}>Download</a>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                        Select a file to preview
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b border-border pb-4">
                    <CardTitle>Quick Filters</CardTitle>
                    <CardDescription>Jump to common tag groups</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={tagFilter === "all" ? "default" : "outline"}
                        className="h-7 rounded-full px-3 text-[11px] uppercase"
                        onClick={() => setTagFilter("all")}
                      >
                        All tags
                      </Button>
                      {quickTags.map((tag) => (
                        <Button
                          key={tag}
                          size="sm"
                          variant={tagFilter === tag ? "default" : "outline"}
                          className="h-7 rounded-full px-3 text-[11px] uppercase"
                          onClick={() => setTagFilter(tag)}
                        >
                          {tag}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="flex h-full flex-col">
                  <CardHeader className="flex-row items-start justify-between space-y-0 border-b border-border pb-4">
                    <div>
                      <CardTitle>Latest Uploads</CardTitle>
                      <CardDescription>STL and 3MF assets stored locally</CardDescription>
                    </div>
                    <Button variant="secondary" size="sm" onClick={handleExportCsv}>
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
                                  <button
                                    className="text-left font-medium text-foreground hover:underline"
                                    onClick={() => setSelectedFile(file)}
                                  >
                                    {file.original_name}
                                  </button>
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
              </div>
            )}

            {activePage === "models" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader className="border-b border-border pb-4">
                    <CardTitle>Model Filters</CardTitle>
                    <CardDescription>Filter by type, tags, and search terms</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative w-full max-w-sm">
                          <Input
                            className="pl-9"
                            placeholder="Search by name or tag"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                          />
                          <div className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground">
                            <SearchIcon />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
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
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={tagFilter === "all" ? "default" : "outline"}
                          className="h-7 rounded-full px-3 text-[11px] uppercase"
                          onClick={() => setTagFilter("all")}
                        >
                          All tags
                        </Button>
                        {quickTags.map((tag) => (
                          <Button
                            key={tag}
                            size="sm"
                            variant={tagFilter === tag ? "default" : "outline"}
                            className="h-7 rounded-full px-3 text-[11px] uppercase"
                            onClick={() => setTagFilter(tag)}
                          >
                            {tag}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedIds.size > 0 && (
                  <Card>
                    <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{selectedIds.size} selected</p>
                        <p className="text-xs text-muted-foreground">Apply bulk tagging or clear tags.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => { setBulkMode("add"); setIsBulkTagOpen(true); }}>
                          Add Tags
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setBulkMode("replace"); setIsBulkTagOpen(true); }}>
                          Replace Tags
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => applyBulkTags({ mode: "clear" })}>
                          Clear Tags
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
                          Clear Selection
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="border-b border-border pb-4">
                    <CardTitle>Tag Presets</CardTitle>
                    <CardDescription>Apply common tags to selected models quickly.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex flex-wrap gap-2">
                      {TAG_PRESETS.map((tag) => (
                        <Button
                          key={tag}
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-full px-3 text-[11px] uppercase"
                          onClick={() => applyPresetToSelection(tag)}
                        >
                          {tag}
                        </Button>
                      ))}
                    </div>
                    {selectedIds.size === 0 && (
                      <p className="mt-3 text-xs text-muted-foreground">Select models to apply presets.</p>
                    )}
                  </CardContent>
                </Card>

                {filteredFiles.length === 0 ? (
                  <Card>
                    <CardContent className="py-16 text-center text-sm text-muted-foreground">
                      No models match the current filters.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredFiles.map((file) => (
                      <Card key={file.id} className="flex h-full flex-col">
                        <CardHeader className="border-b border-border pb-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <CardTitle className="text-base">{file.original_name}</CardTitle>
                              <CardDescription>{new Date(file.created_at).toLocaleDateString()}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border border-border bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                                  checked={selectedIds.has(file.id)}
                                  onChange={() => toggleSelected(file.id)}
                                />
                              </label>
                              <Badge variant="secondary" className="uppercase">
                                {file.extension}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col gap-4 pt-4">
                          <ModelThumbnail
                            fileUrl={`${API_BASE}/api/files/${file.id}/file`}
                            extension={file.extension}
                          />
                          <div className="rounded-lg border border-border/80 bg-muted/30 p-4 text-xs text-muted-foreground">
                            {formatBytes(file.size)} · {file.id}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(file.tags || []).length === 0 ? (
                              <span className="text-xs text-muted-foreground">No tags</span>
                            ) : (
                              file.tags.map((tag) => (
                                <Badge key={tag} variant="muted">
                                  {tag}
                                </Badge>
                              ))
                            )}
                          </div>
                          <div className="mt-auto flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => handlePreview(file)}>
                              Preview
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <a href={`${API_BASE}/api/files/${file.id}/file`}>Download</a>
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => openTagEditor(file)}>
                              Tags
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleAutoTag(file)}>
                              Auto Tag
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activePage === "tags" && (
              <Card>
                <CardContent className="py-16 text-center text-sm text-muted-foreground">
                  Tag analytics and bulk management are coming next.
                </CardContent>
              </Card>
            )}

            {activePage === "reports" && (
              <Card>
                <CardContent className="py-16 text-center text-sm text-muted-foreground">
                  Reporting views will live here once metrics are enabled.
                </CardContent>
              </Card>
            )}
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

      {isTagEditorOpen && selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Edit Tags</CardTitle>
                <CardDescription>Separate tags with commas. Lowercase is recommended.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsTagEditorOpen(false)}>
                Close
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Tags</label>
                <Input
                  value={tagDraft}
                  onChange={(event) => setTagDraft(event.target.value)}
                  className="mt-2"
                  placeholder="utility, bracket, prototype"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => handleAutoTag(selectedFile)}>
                  Auto Tag
                </Button>
                <Button size="sm" variant="outline" onClick={() => setTagDraft("")}
                >
                  Clear
                </Button>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsTagEditorOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSaveTags}>
                  Save Tags
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isBulkTagOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Bulk Tagging</CardTitle>
                <CardDescription>
                  {bulkMode === "replace"
                    ? "Replace tags for selected models."
                    : "Add tags to selected models."}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsBulkTagOpen(false)}>
                Close
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Tags</label>
                <Input
                  value={bulkTagDraft}
                  onChange={(event) => setBulkTagDraft(event.target.value)}
                  className="mt-2"
                  placeholder="fixture, mount, production"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {TAG_PRESETS.map((tag) => (
                  <Button
                    key={tag}
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-full px-3 text-[11px] uppercase"
                    onClick={() => appendPresetTag(tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsBulkTagOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => applyBulkTags({ mode: bulkMode })}>
                  Apply Tags
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isPreviewOpen && selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-4xl">
            <CardHeader className="flex-row items-start justify-between space-y-0 border-b border-border pb-4">
              <div>
                <CardTitle>Preview</CardTitle>
                <CardDescription>{selectedFile.original_name}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(false)}>
                Close
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <ThreeViewer
                fileUrl={`${API_BASE}/api/files/${selectedFile.id}/file`}
                extension={selectedFile.extension}
                className="h-[460px]"
              />
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
