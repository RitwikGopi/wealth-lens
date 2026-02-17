"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { StatusBadge } from "@/components/shared/status-badge";
import { TagBadge } from "@/components/shared/tag-badge";
import { TagPicker } from "@/components/shared/tag-picker";
import { formatDate, formatPercent } from "@/lib/format";
import { api } from "@/lib/api";
import { FixedDeposit, getFDStatus } from "@/types/fixed-deposit";
import { mockFixedDeposits } from "@/lib/mock-data";
import { FDForm } from "@/components/fixed-deposits/fd-form";
import { FDCloseDialog } from "@/components/fixed-deposits/fd-close-dialog";
import { FDRenewDialog } from "@/components/fixed-deposits/fd-renew-dialog";
import { FixedDepositCreate, FixedDepositResponse, FDRenewResponse } from "@/types/fixed-deposit";
import { Pencil, Trash2, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function FDDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [fd, setFd] = useState<FixedDeposit | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await api.get<FixedDeposit>(`/fixed-deposits/${id}`);
        setFd(data);
      } catch {
        const mock = mockFixedDeposits.find((f) => f.id === Number(id));
        setFd(mock || null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  async function handleDelete() {
    try {
      await api.delete(`/fixed-deposits/${id}`);
      toast.success("Fixed deposit deleted");
      router.push("/fixed-deposits");
    } catch {
      toast.error("Failed to delete fixed deposit");
    }
  }

  async function handleAssignTags(tagIds: number[]) {
    await api.post(`/fixed-deposits/${id}/tags`, { tag_ids: tagIds });
    const updated = await api.get<FixedDeposit>(`/fixed-deposits/${id}`);
    setFd(updated);
    toast.success("Tag added");
  }

  async function handleRemoveTag(tagId: number) {
    await api.delete(`/fixed-deposits/${id}/tags/${tagId}`);
    if (fd) {
      setFd({ ...fd, tags: fd.tags.filter((t) => t.id !== tagId) });
    }
    toast.success("Tag removed");
  }

  async function handleEdit(data: FixedDepositCreate) {
    const updated = await api.put<FixedDeposit>(`/fixed-deposits/${id}`, data);
    setFd({ ...updated, tags: updated.tags || fd?.tags || [] });
    toast.success("Fixed deposit updated");
  }

  function handleClosed(closedFd: FixedDepositResponse) {
    if (fd) {
      setFd({ ...fd, ...closedFd });
    }
  }

  function handleRenewed(response: FDRenewResponse) {
    router.push(`/fixed-deposits/${response.new_fd.id}`);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!fd) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-gray-500">Fixed Deposit not found</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/fixed-deposits">Back to Fixed Deposits</Link>
        </Button>
      </div>
    );
  }

  const status = getFDStatus(fd);
  const interest = (fd.current_value || fd.principal) - fd.principal;
  const isClosed = status === "closed";
  const statusVariant =
    status === "active"
      ? "active"
      : status === "maturing_soon"
      ? "maturing"
      : status === "closed"
      ? "closed"
      : "matured";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/fixed-deposits" className="hover:text-gray-700">
          Fixed Deposits
        </Link>
        <span>/</span>
        <span className="text-gray-900">
          {fd.bank_name}
        </span>
      </div>

      {/* FD Info Card */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">
              {fd.bank_name}
            </CardTitle>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge variant={statusVariant}>
                {status === "active"
                  ? "Active"
                  : status === "maturing_soon"
                  ? "Maturing Soon"
                  : status === "closed"
                  ? "Closed"
                  : "Matured"}
              </StatusBadge>
              {fd.auto_renew && (
                <span className="text-xs text-gray-500">Auto-Renewal On</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isClosed && (
              <>
                <Button variant="outline" size="sm" onClick={() => setCloseOpen(true)}>
                  <XCircle className="mr-1 h-4 w-4" />
                  Close FD
                </Button>
                <Button variant="outline" size="sm" onClick={() => setRenewOpen(true)}>
                  <RefreshCw className="mr-1 h-4 w-4" />
                  Renew
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit
                </Button>
              </>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this Fixed Deposit?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this FD record.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            <div>
              <p className="text-sm text-gray-500">Principal</p>
              <p className="font-mono text-lg tabular-nums">
                <CurrencyDisplay value={fd.principal} />
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Interest Rate</p>
              <p className="font-mono text-lg tabular-nums">
                {fd.interest_rate}% p.a.
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Compounding</p>
              <p className="text-lg capitalize">
                {fd.compounding_frequency.replace("_", " ")}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Start Date</p>
              <p className="text-lg">{formatDate(fd.start_date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Maturity Date</p>
              <p className="text-lg">{formatDate(fd.maturity_date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Value</p>
              <p className="font-mono text-lg font-semibold tabular-nums">
                <CurrencyDisplay value={fd.current_value || fd.principal} />
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Interest Earned</p>
              <p className="font-mono text-lg tabular-nums">
                <CurrencyDisplay value={interest} showSign colored />
              </p>
            </div>
            {fd.maturity_amount && (
              <div>
                <p className="text-sm text-gray-500">Maturity Amount</p>
                <p className="font-mono text-lg tabular-nums">
                  <CurrencyDisplay value={fd.maturity_amount} />
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Closure Details */}
      {isClosed && fd.closure_date && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Closure Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
              <div>
                <p className="text-sm text-gray-500">Closure Date</p>
                <p className="text-lg">{formatDate(fd.closure_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount Received</p>
                <p className="font-mono text-lg tabular-nums">
                  <CurrencyDisplay value={fd.closure_amount || 0} />
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Interest Earned</p>
                <p className="font-mono text-lg tabular-nums">
                  <CurrencyDisplay
                    value={(fd.closure_amount || 0) - fd.principal}
                    showSign
                    colored
                  />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {fd.tags.map((tag) => (
              <TagBadge
                key={tag.id}
                name={tag.name}
                color={tag.color}
                size="md"
                removable
                onRemove={() => handleRemoveTag(tag.id)}
              />
            ))}
            <TagPicker
              assignedTags={fd.tags}
              onAssign={handleAssignTags}
              onRemove={handleRemoveTag}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {fd.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{fd.notes}</p>
          </CardContent>
        </Card>
      )}

      <FDForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        mode="edit"
        initialData={fd ? {
          bank_name: fd.bank_name,
          principal: fd.principal,
          interest_rate: fd.interest_rate,
          compounding_frequency: fd.compounding_frequency,
          start_date: fd.start_date,
          maturity_date: fd.maturity_date,
          is_cumulative: fd.is_cumulative ?? true,
          auto_renew: fd.auto_renew ?? false,
          notes: fd.notes || "",
        } : undefined}
      />

      {fd && !isClosed && (
        <>
          <FDCloseDialog
            open={closeOpen}
            onOpenChange={setCloseOpen}
            fd={fd}
            onClosed={handleClosed}
          />
          <FDRenewDialog
            open={renewOpen}
            onOpenChange={setRenewOpen}
            fd={fd}
            onRenewed={handleRenewed}
          />
        </>
      )}
    </div>
  );
}
