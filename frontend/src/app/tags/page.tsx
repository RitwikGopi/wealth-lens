"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TagBadge } from "@/components/shared/tag-badge";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { formatPercent } from "@/lib/format";
import { api } from "@/lib/api";
import { TagTreeNode, TagCreate } from "@/types/tag";
import { mockTagTree } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TAG_COLORS = [
  "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444",
  "#EC4899", "#14B8A6", "#6366F1", "#6B7280",
];

export default function TagsPage() {
  const [tags, setTags] = useState<TagTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<TagTreeNode | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Create form state
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState(TAG_COLORS[0]);
  const [formParentId, setFormParentId] = useState<string>("none");
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  async function fetchTags() {
    try {
      const data = await api.get<TagTreeNode[]>("/tags/tree");
      setTags(data);
    } catch {
      setTags(mockTagTree);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleCreateTag() {
    setFormLoading(true);
    try {
      const data: TagCreate = {
        name: formName,
        color: formColor,
        parent_id: formParentId === "none" ? null : Number(formParentId),
      };
      await api.post("/tags", data);
      await fetchTags();
      setShowCreateForm(false);
      setFormName("");
      setFormColor(TAG_COLORS[0]);
      setFormParentId("none");
      toast.success("Tag created");
    } catch {
      toast.error("Failed to create tag");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeleteTag() {
    if (!selectedTag) return;
    try {
      await api.delete(`/tags/${selectedTag.id}`);
      await fetchTags();
      setSelectedTag(null);
      setShowDeleteDialog(false);
      toast.success("Tag deleted");
    } catch {
      toast.error("Failed to delete tag");
    }
  }

  function renderTreeNode(node: TagTreeNode, level: number = 0) {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedTag?.id === node.id;

    return (
      <div key={node.id}>
        <div
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
            isSelected ? "bg-blue-50 text-blue-800" : "hover:bg-gray-100"
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => setSelectedTag(node)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: node.color || "#6B7280" }}
          />
          <span className="flex-1 truncate">{node.name}</span>
          {node.allocation_target != null && (
            <span className="font-mono text-xs text-gray-500 tabular-nums">
              {node.allocation_target.target_pct}%
            </span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  }

  function flattenTags(nodes: TagTreeNode[]): TagTreeNode[] {
    const result: TagTreeNode[] = [];
    for (const node of nodes) {
      result.push(node);
      if (node.children) {
        result.push(...flattenTags(node.children));
      }
    }
    return result;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">Tags</h1>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Tag
        </Button>
      </div>

      {tags.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium text-gray-900">
              No tags yet
            </p>
            <p className="mt-1 max-w-md text-sm text-gray-500">
              Tags let you categorize investments (e.g. Equity, Debt, Gold) to
              track allocation and measure performance by category.
            </p>
            <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
              + Create Your First Tag
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Tag Tree */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tag Tree</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0.5">
                {tags.map((node) => renderTreeNode(node))}
              </div>
            </CardContent>
          </Card>

          {/* Tag Detail */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tag Detail</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTag ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{
                        backgroundColor: selectedTag.color || "#6B7280",
                      }}
                    />
                    <h3 className="text-lg font-semibold">{selectedTag.name}</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Parent</p>
                      <p>{selectedTag.parent_id ? "Child tag" : "(root)"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Children</p>
                      <p>{selectedTag.children?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Investments</p>
                      <p>{selectedTag.investment_count || 0}</p>
                    </div>
                    {selectedTag.total_value != null && (
                      <div>
                        <p className="text-gray-500">Total Value</p>
                        <p className="font-mono tabular-nums">
                          <CurrencyDisplay value={selectedTag.total_value} />
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm">
                      <Pencil className="mr-1 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-gray-500">
                  Select a tag to view details
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Tag Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Tag Name *</Label>
              <Input
                id="tag-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Equity"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-transform",
                      formColor === color
                        ? "scale-110 border-gray-900"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormColor(color)}
                    type="button"
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Parent Tag</Label>
              <Select value={formParentId} onValueChange={setFormParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="(none)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">(none - top level)</SelectItem>
                  {flattenTags(tags).map((tag) => (
                    <SelectItem key={tag.id} value={String(tag.id)}>
                      {tag.parent_id ? `  ${tag.name}` : tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTag}
              disabled={!formName.trim() || formLoading}
            >
              {formLoading ? "Saving..." : "Save Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Tag &quot;{selectedTag?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedTag?.children && selectedTag.children.length > 0
                ? `This tag has ${selectedTag.children.length} child tag(s). Deleting will also remove all child tags.`
                : "This will remove the tag from all assigned investments."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTag}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
