"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  GripVertical,
  MousePointerClick,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LinkGlyph } from "@/components/link-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { BoardData, BoardLink, PublicBoardData } from "@/lib/db/board";
import { getDictionary, type Dictionary, type Locale } from "@/lib/i18n";
import type { ThemeTokens } from "@/lib/theme";
import type { ProfileData } from "@/lib/profile";
import { DashboardPreviewPanel } from "@/components/dashboard-preview-panel";
import {
  createGroup,
  deleteGroup,
  deleteLink,
  persistBoard,
  renameGroup,
  toggleGroupVisibility,
  toggleLinkActive,
  toggleLinkFeatured,
} from "./actions";
import { LinkFormModal, type LinkModalState } from "./link-form-modal";
import { GroupFormModal, type GroupModalState } from "./group-form-modal";

const GROUP_PREFIX = "group:";
const LINK_PREFIX = "link:";
const UNGROUPED = "ungrouped";

const toGroupContainerId = (id: number) => `${GROUP_PREFIX}${id}`;
const toLinkDragId = (id: number) => `${LINK_PREFIX}${id}`;
const parseNumericId = (prefixedId: string) => Number(prefixedId.split(":")[1]);

// Drop-zone LINK di dalam satu grup (DroppableContainer) dulu makai id yang SAMA PERSIS
// kayak grup-nya sendiri (containerId, buat useSortable drag grup itu) -- dua registrasi
// dnd-kit beda (useSortable vs useDroppable) numpuk di satu id yang sama itu konflik,
// gantian saling nimpa rect satu sama lain di registry dnd-kit, hasilnya drag grup jadi
// "kadang bisa kadang enggak" tergantung mana yang menang. Dikasih suffix biar unik,
// terus di-strip lagi pas dibaca di handleDragOver/handleDragEnd biar tetep bisa dicocokin
// ke containerLinks/groupMeta yang key-nya containerId polos.
const DROP_ZONE_SUFFIX = "::dropzone";
const toDropZoneId = (containerId: string) => `${containerId}${DROP_ZONE_SUFFIX}`;
const fromDropZoneId = (id: string) => (id.endsWith(DROP_ZONE_SUFFIX) ? id.slice(0, -DROP_ZONE_SUFFIX.length) : id);

type GroupMeta = { id: number; name: string; isVisible: boolean };

function buildStateFromData(data: BoardData) {
  const groupOrder = data.groups.map((group) => toGroupContainerId(group.id));
  const groupMeta: Record<string, GroupMeta> = Object.fromEntries(
    data.groups.map((group) => [
      toGroupContainerId(group.id),
      { id: group.id, name: group.name, isVisible: group.isVisible },
    ]),
  );
  const containerLinks: Record<string, BoardLink[]> = {
    [UNGROUPED]: data.ungrouped,
    ...Object.fromEntries(data.groups.map((group) => [toGroupContainerId(group.id), group.links])),
  };
  return { groupOrder, groupMeta, containerLinks };
}

function DroppableContainer({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-12 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors",
        isOver ? "border-primary bg-primary/5" : "border-transparent",
      )}
    >
      {children}
    </div>
  );
}

function SortableLinkRow({
  link,
  clicks,
  onToggleActive,
  onToggleFeatured,
  onEdit,
  onDelete,
}: {
  link: BoardLink;
  clicks: number;
  onToggleActive: (isActive: boolean) => void;
  onToggleFeatured: (featured: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dragId = toLinkDragId(link.id);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: dragId,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      id={`link-row-${link.id}`}
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border bg-muted/50 p-3 text-sm",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        {link.thumbnailPath ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview thumbnail hasil upload sendiri, bukan kandidat next/image
          <img src={`/uploads/${link.thumbnailPath}`} alt="" className="size-8 shrink-0 rounded-lg object-cover" />
        ) : (
          // LinkGlyph (bukan cuma link.icon ? ... : null) -- reuse fallback-nya link-card.tsx
          // (default per linkType, lalu favicon) biar list drag-drop ini KONSISTEN sama
          // halaman publik/live preview, bukan nampilin kotak kosong pas user gak set icon manual.
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
            <LinkGlyph link={link} className="size-4" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">{link.title}</span>
            {link.linkType !== "url" ? <Badge variant="sky">{link.linkType}</Badge> : null}
          </div>
          <div className="truncate text-xs text-muted-foreground">{link.url}</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden items-center gap-1 text-xs font-medium text-muted-foreground sm:flex" title="Clicks">
          <MousePointerClick className="size-3.5" />
          {clicks}
        </span>
        <button
          type="button"
          onClick={() => onToggleFeatured(!link.featured)}
          className={cn(
            "text-muted-foreground hover:text-foreground",
            link.featured && "text-amber-500 hover:text-amber-500",
          )}
        >
          <Star className="size-4" fill={link.featured ? "currentColor" : "none"} />
        </button>
        <Switch checked={link.isActive} onCheckedChange={onToggleActive} />
        <button type="button" onClick={onEdit} className="p-1 text-muted-foreground hover:text-foreground">
          <Pencil className="size-3.5" />
        </button>
        <button type="button" onClick={onDelete} className="p-1 text-destructive/70 hover:text-destructive">
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function SortableGroupCard({
  containerId,
  group,
  links,
  clickCounts,
  forceCollapsed,
  onToggleVisibility,
  onRenameGroup,
  onDeleteGroup,
  onToggleLinkActive,
  onToggleLinkFeatured,
  onEditLink,
  onDeleteLink,
  onAddLink,
  t,
}: {
  containerId: string;
  group: GroupMeta;
  links: BoardLink[];
  clickCounts: Record<number, number>;
  // true selama drag REORDER GROUP lagi jalan (lihat Board) -- card grup laen numpuk
  // panjang bikin drag target susah dijangkau, jadi dipaksa collapse sementara biar
  // gampang, balik ke state expand/collapse `expanded` masing-masing abis drag selesai.
  forceCollapsed: boolean;
  onToggleVisibility: (isVisible: boolean) => void;
  onRenameGroup: () => void;
  onDeleteGroup: () => void;
  onToggleLinkActive: (linkId: number, isActive: boolean) => void;
  onToggleLinkFeatured: (linkId: number, featured: boolean) => void;
  onEditLink: (link: BoardLink) => void;
  onDeleteLink: (linkId: number) => void;
  onAddLink: () => void;
  t: Dictionary;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: containerId,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [expanded, setExpanded] = useState(true);
  const isExpanded = expanded && !forceCollapsed;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "space-y-4 rounded-xl border bg-card p-5 shadow-sm",
        isDragging && "opacity-60",
      )}
    >
      <div className={cn("flex items-center justify-between", isExpanded && "border-b pb-3")}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-muted-foreground hover:text-foreground"
            title={isExpanded ? t.board.collapse : t.board.expand}
          >
            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
          <Folder className="size-4 text-primary" />
          <span className="text-sm font-semibold">{group.name}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {links.length} {t.board.itemsCount}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRenameGroup}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            title={t.board.renameGroup}
          >
            <Pencil className="size-3.5" />
          </button>
          <Switch checked={group.isVisible} onCheckedChange={onToggleVisibility} />
          <button type="button" onClick={onDeleteGroup} className="rounded p-1 text-destructive hover:bg-destructive/10">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {isExpanded ? (
        <>
          <SortableContext items={links.map((link) => toLinkDragId(link.id))} strategy={verticalListSortingStrategy}>
            <DroppableContainer id={toDropZoneId(containerId)}>
              <div
                className={cn(
                  "space-y-2 border-l-2 pl-4 transition-opacity",
                  group.isVisible ? "border-primary/30" : "border-border opacity-50 grayscale",
                )}
              >
                {links.map((link) => (
                  <SortableLinkRow
                    key={link.id}
                    link={link}
                    clicks={clickCounts[link.id] ?? 0}
                    onToggleActive={(isActive) => onToggleLinkActive(link.id, isActive)}
                    onToggleFeatured={(featured) => onToggleLinkFeatured(link.id, featured)}
                    onEdit={() => onEditLink(link)}
                    onDelete={() => onDeleteLink(link.id)}
                  />
                ))}
              </div>
            </DroppableContainer>
          </SortableContext>

          <Button type="button" variant="outline" size="sm" onClick={onAddLink}>
            <Plus className="size-3.5" /> {t.board.addLink}
          </Button>
        </>
      ) : null}
    </div>
  );
}

export function Board({
  pageId,
  initialData,
  locale,
  tokens,
  profile,
  fallbackName,
  clickCounts,
  openLinkId,
  socialPreviewBoard,
}: {
  pageId: number;
  initialData: BoardData;
  locale: Locale;
  tokens: ThemeTokens;
  profile: ProfileData;
  fallbackName: string;
  clickCounts: Record<number, number>;
  openLinkId?: number | null;
  // getBoardData (initialData) sengaja gak nyertain link displayStyle "icon" (baris
  // sosmed) -- ini sumber TERPISAH (getPublicBoardData, nyertain semua link) khusus
  // buat nyuplai baris icon sosmed ke preview HP di bawah, biar previewnya konsisten
  // sama halaman publik beneran (yang juga nampilin baris sosmed itu).
  socialPreviewBoard: PublicBoardData;
}) {
  const t = getDictionary(locale);
  const router = useRouter();
  // Server action tidak otomatis me-refresh Server Component di halaman ini kalau
  // dipanggil langsung dari client code (bukan lewat <form action={serverAction}>),
  // jadi router.refresh() dipanggil manual setelah tiap action selesai.
  function runAction(action: Promise<unknown>) {
    void action.then(() => router.refresh());
  }

  const [syncedData, setSyncedData] = useState(initialData);
  const [{ groupOrder, groupMeta, containerLinks }, setState] = useState(() =>
    buildStateFromData(initialData),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<LinkModalState | null>(null);
  const [groupModalState, setGroupModalState] = useState<GroupModalState | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // Data baru dari server (setelah create/delete + revalidatePath) -> reset state lokal.
  // Di-set saat render (bukan di useEffect) supaya tidak ada cascading render ekstra.
  if (initialData !== syncedData) {
    setSyncedData(initialData);
    setState(buildStateFromData(initialData));
  }

  // Hasil klik dari search bar dashboard (components/dashboard-search.tsx) -> ?openLink=<id>
  // di URL. Cari linknya di state lokal, scroll ke row-nya, terus buka modal edit-nya.
  useEffect(() => {
    if (!openLinkId) return;
    const link = Object.values(containerLinks)
      .flat()
      .find((l) => l.id === openLinkId);
    if (!link) return;
    // Merespons navigasi dari luar (URL ?openLink=), bukan derived state dari props/state
    // lain -> sengaja setState di effect ini.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModalState({ mode: "edit", link });
    document.getElementById(`link-row-${openLinkId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Sengaja cuma gantung ke openLinkId (bukan containerLinks) biar gak keulang tiap kali board di-drag/toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openLinkId]);

  function findContainerOfLink(linkDragId: string) {
    return Object.keys(containerLinks).find((key) =>
      containerLinks[key].some((link) => toLinkDragId(link.id) === linkDragId),
    );
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = fromDropZoneId(String(over.id));
    if (!activeId.startsWith(LINK_PREFIX) || activeId === overId) return;

    const fromContainer = findContainerOfLink(activeId);
    const toContainer = containerLinks[overId] ? overId : findContainerOfLink(overId);
    if (!fromContainer || !toContainer || fromContainer === toContainer) return;

    setState((prev) => {
      const fromItems = prev.containerLinks[fromContainer];
      const toItems = prev.containerLinks[toContainer];
      const activeIndex = fromItems.findIndex((link) => toLinkDragId(link.id) === activeId);
      if (activeIndex === -1) return prev;
      const overIndex = toItems.findIndex((link) => toLinkDragId(link.id) === overId);
      const insertAt = overIndex >= 0 ? overIndex : toItems.length;

      const item = fromItems[activeIndex];
      const nextFrom = fromItems.filter((_, i) => i !== activeIndex);
      const nextTo = [...toItems.slice(0, insertAt), item, ...toItems.slice(insertAt)];

      return {
        ...prev,
        containerLinks: { ...prev.containerLinks, [fromContainer]: nextFrom, [toContainer]: nextTo },
      };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = fromDropZoneId(String(over.id));

    let finalGroupOrder = groupOrder;
    let finalContainerLinks = containerLinks;

    if (activeId.startsWith(GROUP_PREFIX)) {
      if (activeId !== overId && overId.startsWith(GROUP_PREFIX)) {
        const oldIndex = groupOrder.indexOf(activeId);
        const newIndex = groupOrder.indexOf(overId);
        if (oldIndex !== -1 && newIndex !== -1) {
          finalGroupOrder = arrayMove(groupOrder, oldIndex, newIndex);
          setState((prev) => ({ ...prev, groupOrder: finalGroupOrder }));
        }
      }
    } else if (activeId.startsWith(LINK_PREFIX)) {
      const container = findContainerOfLink(activeId) ?? (containerLinks[overId] ? overId : findContainerOfLink(overId));
      if (container) {
        const items = containerLinks[container];
        const oldIndex = items.findIndex((link) => toLinkDragId(link.id) === activeId);
        const overIndex = items.findIndex((link) => toLinkDragId(link.id) === overId);
        if (oldIndex !== -1 && overIndex !== -1 && oldIndex !== overIndex) {
          const reordered = arrayMove(items, oldIndex, overIndex);
          finalContainerLinks = { ...containerLinks, [container]: reordered };
          setState((prev) => ({ ...prev, containerLinks: finalContainerLinks }));
        }
      }
    }

    runAction(
      persistBoard({
        pageId,
        groupOrder: finalGroupOrder.map(parseNumericId),
        groups: Object.fromEntries(
          finalGroupOrder.map((containerId) => [
            parseNumericId(containerId),
            finalContainerLinks[containerId].map((link) => link.id),
          ]),
        ),
        ungrouped: finalContainerLinks[UNGROUPED].map((link) => link.id),
      }),
    );
  }

  function handleToggleVisibility(groupId: number, isVisible: boolean) {
    setState((prev) => {
      const key = toGroupContainerId(groupId);
      return { ...prev, groupMeta: { ...prev.groupMeta, [key]: { ...prev.groupMeta[key], isVisible } } };
    });
    runAction(toggleGroupVisibility(pageId, groupId, isVisible));
  }

  function handleToggleLinkActive(linkId: number, isActive: boolean) {
    setState((prev) => {
      const container = Object.keys(prev.containerLinks).find((key) =>
        prev.containerLinks[key].some((link) => link.id === linkId),
      );
      if (!container) return prev;
      return {
        ...prev,
        containerLinks: {
          ...prev.containerLinks,
          [container]: prev.containerLinks[container].map((link) =>
            link.id === linkId ? { ...link, isActive } : link,
          ),
        },
      };
    });
    runAction(toggleLinkActive(pageId, linkId, isActive));
  }

  function handleToggleLinkFeatured(linkId: number, featured: boolean) {
    setState((prev) => {
      const container = Object.keys(prev.containerLinks).find((key) =>
        prev.containerLinks[key].some((link) => link.id === linkId),
      );
      if (!container) return prev;
      return {
        ...prev,
        containerLinks: {
          ...prev.containerLinks,
          [container]: prev.containerLinks[container].map((link) =>
            link.id === linkId ? { ...link, featured } : link,
          ),
        },
      };
    });
    runAction(toggleLinkFeatured(pageId, linkId, featured));
  }

  // Dipanggil dari tombol "+ tambah group" di dalam modal Link (link-form-modal.tsx) --
  // beda dari handleGroupModalSubmit di bawah (itu fire-and-forget, dipakai tombol "Add
  // Group" utama), ini WAJIB nunggu balikan id-nya biar langsung bisa di-select di
  // dropdown target tanpa nutup/reset modal Link-nya. Update groupOrder/groupMeta/
  // containerLinks lokal langsung (bukan nunggu router.refresh()) biar group barunya juga
  // langsung muncul sebagai opsi di dropdown itu sendiri.
  async function handleQuickCreateGroup(name: string): Promise<{ id: number; name: string } | null> {
    const created = await createGroup(pageId, name);
    if (!created) return null;
    const containerId = toGroupContainerId(created.id);
    setState((prev) => ({
      ...prev,
      groupOrder: [...prev.groupOrder, containerId],
      groupMeta: { ...prev.groupMeta, [containerId]: { id: created.id, name: created.name, isVisible: true } },
      containerLinks: { ...prev.containerLinks, [containerId]: [] },
    }));
    router.refresh();
    return created;
  }

  function handleGroupModalSubmit(name: string, groupId: number | null) {
    if (groupId === null) {
      runAction(createGroup(pageId, name));
      return;
    }
    setState((prev) => {
      const key = toGroupContainerId(groupId);
      return { ...prev, groupMeta: { ...prev.groupMeta, [key]: { ...prev.groupMeta[key], name } } };
    });
    runAction(renameGroup(pageId, groupId, name));
  }

  const activeLink = activeId?.startsWith(LINK_PREFIX)
    ? Object.values(containerLinks)
        .flat()
        .find((link) => toLinkDragId(link.id) === activeId)
    : undefined;
  const activeGroup = activeId && groupMeta[activeId] ? groupMeta[activeId] : undefined;
  // Cuma pas nge-drag GROUP (bukan link) -- reorder link antar-group justru butuh grup
  // tujuannya tetap kebuka biar drop zone-nya keliatan.
  const isDraggingGroup = activeId?.startsWith(GROUP_PREFIX) ?? false;
  const groupOptions = groupOrder.map((id) => groupMeta[id]);

  // Baris icon sosmed gak ada di containerLinks sama sekali (getBoardData nge-skip-nya),
  // jadi ditarik dari socialPreviewBoard (getPublicBoardData) terus disisipin ke ungrouped
  // -- PublicPagePreview bakal misahin lagi sendiri lewat splitIconLinks pas render (lihat
  // components/social-icon-row.tsx), gak ketuker sama link biasa.
  const socialIconLinks = [
    ...socialPreviewBoard.ungrouped,
    ...socialPreviewBoard.groups.flatMap((group) => group.links),
  ].filter((link) => link.displayStyle === "icon");

  // Preview HP di kanan pakai state lokal (bukan re-fetch dari server) biar kerasa "hidup"
  // instan pas drag-reorder / toggle active / toggle featured, sama kayak Linktree.
  const livePreviewBoard: PublicBoardData = {
    ungrouped: [...containerLinks[UNGROUPED].filter((link) => link.isActive), ...socialIconLinks],
    groups: groupOrder
      .map((containerId) => groupMeta[containerId])
      .filter((meta) => meta.isVisible)
      .map((meta) => ({
        id: meta.id,
        name: meta.name,
        links: (containerLinks[toGroupContainerId(meta.id)] ?? []).filter((link) => link.isActive),
      })),
  };

  return (
    // Preview HP kanan "diem" beneran (bukan cuma sticky, yang tetep ikut gerak dikit
    // sebelum nyangkut) -- row-nya dikasih tinggi tetap setinggi viewport, cuma kolom
    // KIRI yang scroll sendiri di dalamnya, sama persis pola yang dipakai tab Theme.
    <div className="flex flex-col gap-8 lg:flex-row">
      <div className="min-w-0 flex-1 pb-12">
        {/* Cuma tombolnya doang yang floating/sticky (pill kecil + shadow), BUKAN bar
            full-width -- kalau seluruh bar ikut sticky+opaque, dia nutupin link-link lain
            yang lewat di bawahnya pas discroll. */}
        <div className="sticky top-4 z-20 mb-6 flex justify-end">
          <div className="flex gap-3 rounded-lg border bg-background p-2 shadow-md">
            <Button type="button" variant="outline" onClick={() => setGroupModalState({ mode: "create" })}>
              <FolderPlus className="text-primary" /> {t.board.addGroup}
            </Button>
            <Button type="button" onClick={() => setModalState({ mode: "create", groupId: null })}>
              <Plus /> {t.board.addLink}
            </Button>
          </div>
        </div>

        <DndContext
          id="kitab-link-board"
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-6">
            <div className="rounded-xl border border-dashed p-5">
              <div className="mb-3 text-sm font-semibold text-muted-foreground">{t.board.noGroup}</div>
              <SortableContext
                items={containerLinks[UNGROUPED].map((link) => toLinkDragId(link.id))}
                strategy={verticalListSortingStrategy}
              >
                <DroppableContainer id={UNGROUPED}>
                  <div className="space-y-2">
                    {containerLinks[UNGROUPED].map((link) => (
                      <SortableLinkRow
                        key={link.id}
                        link={link}
                        clicks={clickCounts[link.id] ?? 0}
                        onToggleActive={(isActive) => handleToggleLinkActive(link.id, isActive)}
                        onToggleFeatured={(featured) => handleToggleLinkFeatured(link.id, featured)}
                        onEdit={() => setModalState({ mode: "edit", link })}
                        onDelete={() => runAction(deleteLink(pageId, link.id))}
                      />
                    ))}
                  </div>
                </DroppableContainer>
              </SortableContext>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setModalState({ mode: "create", groupId: null })}
              >
                <Plus className="size-3.5" /> {t.board.addLink}
              </Button>
            </div>

            <SortableContext items={groupOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-6">
                {groupOrder.map((containerId) => {
                  const meta = groupMeta[containerId];
                  return (
                    <SortableGroupCard
                      key={containerId}
                      containerId={containerId}
                      group={meta}
                      links={containerLinks[containerId] ?? []}
                      clickCounts={clickCounts}
                      forceCollapsed={isDraggingGroup}
                      onToggleVisibility={(checked) => handleToggleVisibility(meta.id, checked)}
                      onRenameGroup={() => setGroupModalState({ mode: "rename", groupId: meta.id, currentName: meta.name })}
                      onDeleteGroup={() => runAction(deleteGroup(pageId, meta.id))}
                      onToggleLinkActive={handleToggleLinkActive}
                      onToggleLinkFeatured={handleToggleLinkFeatured}
                      onEditLink={(link) => setModalState({ mode: "edit", link })}
                      onDeleteLink={(linkId) => runAction(deleteLink(pageId, linkId))}
                      onAddLink={() => setModalState({ mode: "create", groupId: meta.id })}
                      t={t}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </div>

          <DragOverlay>
            {activeLink ? (
              <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-lg">{activeLink.title}</div>
            ) : activeGroup ? (
              <div className="rounded-xl border bg-card p-3 font-medium shadow-lg">{activeGroup.name}</div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <DashboardPreviewPanel tokens={tokens} profile={profile} fallbackName={fallbackName} previewBoard={livePreviewBoard} t={t} usePhoneFrame={false} />

      <LinkFormModal
        key={modalState ? (modalState.mode === "edit" ? `edit-${modalState.link.id}` : `create-${modalState.groupId}`) : "link-closed"}
        pageId={pageId}
        groups={groupOptions}
        state={modalState}
        t={t}
        onClose={() => setModalState(null)}
        onCreateGroup={handleQuickCreateGroup}
        onSaved={() => {
          setModalState(null);
          router.refresh();
        }}
      />

      <GroupFormModal
        key={groupModalState ? (groupModalState.mode === "rename" ? `rename-${groupModalState.groupId}` : "create") : "group-closed"}
        state={groupModalState}
        t={t}
        onClose={() => setGroupModalState(null)}
        onSubmit={handleGroupModalSubmit}
      />
    </div>
  );
}
