"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Dictionary } from "@/lib/i18n";
import { createApiTokenAction } from "./integrations-actions";

export function TokenCreator({ t }: { t: Dictionary }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["links:read"]);
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  const scopeOptions = [
    { value: "links:read", label: t.integrations.scopeRead },
    { value: "links:write", label: t.integrations.scopeWrite },
    { value: "discord:read", label: t.integrations.scopeDiscordRead },
    { value: "discord:write", label: t.integrations.scopeDiscordWrite },
  ];

  if (createdToken) {
    return (
      <div className="rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm dark:bg-amber-950">
        <p className="font-medium">{t.integrations.tokenCreatedNote}</p>
        <code className="mt-1 block break-all rounded bg-black/5 p-2 font-mono text-xs dark:bg-white/10">
          {createdToken}
        </code>
        <Button
          className="mt-2"
          size="sm"
          variant="outline"
          onClick={() => {
            setCreatedToken(null);
            setName("");
            router.refresh();
          }}
        >
          {t.common.done}
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      action={() => {
        if (!name.trim()) return;
        createApiTokenAction(name, scopes).then((result) => setCreatedToken(result.token));
      }}
    >
      <Input
        placeholder={t.integrations.createTokenName}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-48"
      />
      <div className="flex gap-3 text-sm">
        {scopeOptions.map((opt) => (
          <label key={opt.value} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={scopes.includes(opt.value)}
              onChange={(e) =>
                setScopes((prev) =>
                  e.target.checked ? [...prev, opt.value] : prev.filter((s) => s !== opt.value),
                )
              }
            />
            {opt.label}
          </label>
        ))}
      </div>
      <Button type="submit">{t.integrations.createToken}</Button>
    </form>
  );
}
