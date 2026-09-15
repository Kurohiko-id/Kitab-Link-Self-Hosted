"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { LinkIconRenderer } from "@/components/link-icon";
import { IconPicker } from "@/components/icon-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BRAND_ICONS, type BrandIconId } from "@/lib/icons";
import { saveSocialLinksAction, type SocialLinkItem } from "@/app/dashboard/social-links-actions";
import type { Dictionary } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Row = { key: string; id?: number; icon: string; url: string };
type Position = "top" | "bottom";
// null = lagi nambah row baru (grid platform/slot custom), object = lagi ganti icon row
// yang UDAH ADA (diklik dari badge icon-nya sendiri) -- dua-duanya reuse Dialog+IconPicker
// yang sama, cuma beda apa yang dilakuin pas user milih icon-nya (lihat handleIconPicked).
type PickerTarget = { position: Position; rowKey: string | null };
const CUSTOM_SLOT_COUNT = 3;

let tempKeySeq = 0;
function toRows(items: SocialLinkItem[]): Row[] {
  return items.map((item) => ({ key: item.id ? `link-${item.id}` : `new-${++tempKeySeq}`, id: item.id, icon: item.icon, url: item.url }));
}

function normalizeIconValue(icon: string): string {
  return icon.includes(":") ? icon : `brand:${icon}`;
}

// Satu baris social link -- draggable (GripVertical, geser buat urutin) + badge icon-nya
// sendiri jadi tombol (klik buat ganti icon-nya doang, gak perlu hapus+nambah ulang lagi).
function SortableSocialRow({
  row,
  onUpdateUrl,
  onRemoveRow,
  onEditIcon,
  t,
}: {
  row: Row;
  onUpdateUrl: (key: string, url: string) => void;
  onRemoveRow: (key: string) => void;
  onEditIcon: (key: string) => void;
  t: Dictionary;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.key });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={cn("flex items-center gap-2", isDragging && "z-10 opacity-50")}>
      <button
        type="button"
        title={t.settings.dragToReorder}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4 shrink-0" />
      </button>
      <button
        type="button"
        onClick={() => onEditIcon(row.key)}
        title={t.settings.editIcon}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-80"
      >
        <LinkIconRenderer value={normalizeIconValue(row.icon)} className="size-4" />
      </button>
      <Input
        value={row.url}
        onChange={(e) => onUpdateUrl(row.key, e.target.value)}
        placeholder="https://..."
        className="flex-1"
      />
      <Button type="button" variant="destructive" size="icon" onClick={() => onRemoveRow(row.key)}>
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function SocialLinkSection({
  title,
  enabled,
  onToggleEnabled,
  rows,
  onAddPlatform,
  onOpenCustomPicker,
  onUpdateUrl,
  onRemoveRow,
  onEditIcon,
  onReorder,
  t,
}: {
  title: string;
  enabled: boolean;
  onToggleEnabled: (value: boolean) => void;
  rows: Row[];
  onAddPlatform: (icon: string) => void;
  onOpenCustomPicker: () => void;
  onUpdateUrl: (key: string, url: string) => void;
  onRemoveRow: (key: string) => void;
  onEditIcon: (key: string) => void;
  onReorder: (activeKey: string, overKey: string) => void;
  t: Dictionary;
}) {
  const [expanded, setExpanded] = useState(enabled);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  }

  return (
    <div className="rounded-xl border">
      {/* Bukan satu <button> gede -- Switch dari Radix/Base UI juga render <button>
          sendiri, dan nested <button> itu invalid HTML + klik-nya bisa nyasar. Jadi
          chevron/judul (toggle expand) dan Switch (toggle aktif) dipisah jadi 2 elemen
          sejajar, bukan satu ketimpa satu. */}
      <div className="flex w-full items-center justify-between gap-3 p-3.5">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left text-sm font-semibold"
        >
          <ChevronDown className={cn("size-4 shrink-0 transition-transform", !expanded && "-rotate-90")} />
          {title}
        </button>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => {
            onToggleEnabled(checked);
            if (checked) setExpanded(true);
          }}
        />
      </div>

      {expanded ? (
        <div className="flex flex-col gap-4 border-t p-3.5">
          {rows.length > 0 ? (
            /* id explicit di prop DndContext di bawah -- tanpa ini dnd-kit ngandelin counter
               auto-increment global buat bikin aria-describedby, dan urutannya bisa beda
               antara SSR & client hydration kalau ada lebih dari 1 DndContext di halaman
               (di sini ada 2, atas+bawah), nyebabin hydration mismatch warning. */
            <DndContext id={`social-links-${title}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={rows.map((r) => r.key)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2">
                  {rows.map((row) => (
                    <SortableSocialRow
                      key={row.key}
                      row={row}
                      onUpdateUrl={onUpdateUrl}
                      onRemoveRow={onRemoveRow}
                      onEditIcon={onEditIcon}
                      t={t}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">{t.settings.addPlatform}</p>
            <div className="grid grid-cols-8 gap-2">
              {(Object.keys(BRAND_ICONS) as BrandIconId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  title={BRAND_ICONS[id].title}
                  onClick={() => onAddPlatform(id)}
                  className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  <LinkIconRenderer value={`brand:${id}`} className="size-4" />
                </button>
              ))}
              {Array.from({ length: CUSTOM_SLOT_COUNT }).map((_, i) => (
                <button
                  key={`custom-${i}`}
                  type="button"
                  title={t.settings.customIcon}
                  onClick={onOpenCustomPicker}
                  className="flex size-9 items-center justify-center rounded-full border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Plus className="size-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Manajemen "Social Links" berdiri sendiri (bukan lewat modal edit link biasa) -- dua
// daftar independen (atas/bawah), masing-masing collapsible dengan switch aktif/nonaktif
// di headernya sendiri. Nge-tap platform langsung nambah baris baru, isi/hapus semua
// di-state client dulu, baru di-commit sekali pas klik Save (lihat
// app/dashboard/social-links-actions.ts). 3 slot "custom" per section buka icon picker
// penuh (generic + brand) buat yang gak ada di grid platform kurasi. Icon row yang UDAH
// ADA bisa diganti langsung (klik badge-nya) dan diurutin drag-drop (dnd-kit, pola yang
// sama kayak board.tsx) -- urutan array = orderIndex yang di-save (lihat reconcilePosition
// di social-links-actions.ts).
export function SocialLinksManager({
  pageId,
  initialTop,
  initialBottom,
  initialShowTop,
  initialShowBottom,
  t,
}: {
  pageId: number;
  initialTop: SocialLinkItem[];
  initialBottom: SocialLinkItem[];
  initialShowTop: boolean;
  initialShowBottom: boolean;
  t: Dictionary;
}) {
  const router = useRouter();
  const [synced, setSynced] = useState({ top: initialTop, bottom: initialBottom });
  const [topRows, setTopRows] = useState<Row[]>(() => toRows(initialTop));
  const [bottomRows, setBottomRows] = useState<Row[]>(() => toRows(initialBottom));
  const [showTop, setShowTop] = useState(initialShowTop);
  const [showBottom, setShowBottom] = useState(initialShowBottom);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [pending, startTransition] = useTransition();

  // Data baru dari server (setelah save + revalidatePath) -> reset state lokal, sama
  // pola kayak app/dashboard/board.tsx.
  if (initialTop !== synced.top || initialBottom !== synced.bottom) {
    setSynced({ top: initialTop, bottom: initialBottom });
    setTopRows(toRows(initialTop));
    setBottomRows(toRows(initialBottom));
    setShowTop(initialShowTop);
    setShowBottom(initialShowBottom);
  }

  const setRowsFor = (position: Position) => (position === "top" ? setTopRows : setBottomRows);
  const rowsFor = (position: Position) => (position === "top" ? topRows : bottomRows);

  function addPlatform(position: Position, icon: string) {
    setRowsFor(position)((prev) => [...prev, { key: `new-${++tempKeySeq}`, icon, url: "" }]);
  }

  function updateUrl(position: Position, key: string, url: string) {
    setRowsFor(position)((prev) => prev.map((row) => (row.key === key ? { ...row, url } : row)));
  }

  function updateIcon(position: Position, key: string, icon: string) {
    setRowsFor(position)((prev) => prev.map((row) => (row.key === key ? { ...row, icon } : row)));
  }

  function removeRow(position: Position, key: string) {
    setRowsFor(position)((prev) => prev.filter((row) => row.key !== key));
  }

  function reorder(position: Position, activeKey: string, overKey: string) {
    setRowsFor(position)((prev) => {
      const oldIndex = prev.findIndex((r) => r.key === activeKey);
      const newIndex = prev.findIndex((r) => r.key === overKey);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function handleIconPicked(value: string) {
    if (!value || !pickerTarget) return;
    if (pickerTarget.rowKey) {
      updateIcon(pickerTarget.position, pickerTarget.rowKey, value);
    } else {
      addPlatform(pickerTarget.position, value);
    }
    setPickerTarget(null);
  }

  function handleSave() {
    const toItems = (rows: Row[]): SocialLinkItem[] =>
      rows.filter((row) => row.url.trim()).map((row) => ({ id: row.id, icon: row.icon, url: row.url.trim() }));
    startTransition(async () => {
      await saveSocialLinksAction(pageId, toItems(topRows), toItems(bottomRows), showTop, showBottom);
      router.refresh();
    });
  }

  const editingRow = pickerTarget?.rowKey ? rowsFor(pickerTarget.position).find((r) => r.key === pickerTarget.rowKey) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">{t.settings.socialLinksHint}</p>

      <SocialLinkSection
        title={t.settings.socialIconsShowTop}
        enabled={showTop}
        onToggleEnabled={setShowTop}
        rows={topRows}
        onAddPlatform={(icon) => addPlatform("top", icon)}
        onOpenCustomPicker={() => setPickerTarget({ position: "top", rowKey: null })}
        onUpdateUrl={(key, url) => updateUrl("top", key, url)}
        onRemoveRow={(key) => removeRow("top", key)}
        onEditIcon={(key) => setPickerTarget({ position: "top", rowKey: key })}
        onReorder={(activeKey, overKey) => reorder("top", activeKey, overKey)}
        t={t}
      />

      <SocialLinkSection
        title={t.settings.socialIconsShowBottom}
        enabled={showBottom}
        onToggleEnabled={setShowBottom}
        rows={bottomRows}
        onAddPlatform={(icon) => addPlatform("bottom", icon)}
        onOpenCustomPicker={() => setPickerTarget({ position: "bottom", rowKey: null })}
        onUpdateUrl={(key, url) => updateUrl("bottom", key, url)}
        onRemoveRow={(key) => removeRow("bottom", key)}
        onEditIcon={(key) => setPickerTarget({ position: "bottom", rowKey: key })}
        onReorder={(activeKey, overKey) => reorder("bottom", activeKey, overKey)}
        t={t}
      />

      <Button type="button" className="self-start" onClick={handleSave} disabled={pending}>
        {pending ? t.common.saving : t.common.save}
      </Button>

      <Dialog open={pickerTarget !== null} onOpenChange={(open) => !open && setPickerTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{pickerTarget?.rowKey ? t.settings.editIcon : t.settings.customIcon}</DialogTitle>
          </DialogHeader>
          <IconPicker
            value={editingRow ? normalizeIconValue(editingRow.icon) : ""}
            onChange={handleIconPicked}
            t={t}
            showAutoOption={false}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
