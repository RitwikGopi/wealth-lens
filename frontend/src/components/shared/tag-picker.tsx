"use client";

import { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Tag } from "@/types/tag";
import { TagBrief } from "@/types/holding";

interface TagPickerProps {
  assignedTags: TagBrief[];
  onAssign: (tagIds: number[]) => Promise<void>;
  onRemove: (tagId: number) => Promise<void>;
}

export function TagPicker({ assignedTags, onAssign, onRemove }: TagPickerProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      api.get<Tag[]>("/tags").then(setAllTags).catch(() => {});
    }
  }, [open]);

  const assignedIds = new Set(assignedTags.map((t) => t.id));
  const available = allTags.filter((t) => !assignedIds.has(t.id));

  async function handleSelect(tagId: number) {
    await onAssign([tagId]);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="text-blue-800">
          + Add Tag
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        {available.length === 0 ? (
          <p className="px-2 py-1 text-xs text-gray-500">No more tags available</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {available.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleSelect(tag.id)}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100"
              >
                {tag.color && (
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                )}
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
