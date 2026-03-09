"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Drawer } from "vaul";

import CustomSelect from "@/components/CustomSelect";
import { AuthStatus, Profile, Project, apiClientJson } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";

const speciesOptions = [
  { value: "pig", label: "Pig" },
  { value: "goat", label: "Goat" },
  { value: "sheep", label: "Sheep" },
  { value: "cow", label: "Cow" },
  { value: "chicken", label: "Chicken" },
  { value: "rabbit", label: "Rabbit" },
  { value: "horse", label: "Horse" },
  { value: "turkey", label: "Turkey" },
  { value: "duck", label: "Duck" },
  { value: "other", label: "Other" },
  { value: "non-livestock", label: "Non-livestock" }
];

const projectTypeOptions = [
  { value: "market", label: "Market" },
  { value: "breeding", label: "Breeding" },
  { value: "showmanship", label: "Showmanship" },
  { value: "dairy", label: "Dairy" },
  { value: "poultry", label: "Poultry" },
  { value: "rabbit", label: "Rabbit" },
  { value: "non-livestock", label: "Non-livestock" }
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectType, setProjectType] = useState("");
  const [status, setStatus] = useState("");
  const [owner, setOwner] = useState("");
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [projectTypeValue, setProjectTypeValue] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [targetWeightLbs, setTargetWeightLbs] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [projectData, profileData, authData] = await Promise.all([
        apiClientJson<Project[]>(`/projects?project_type=${projectType}&status=${status}&owner=${owner}`),
        apiClientJson<Profile[]>("/profiles"),
        apiClientJson<AuthStatus>("/auth/status")
      ]);
      setProjects(projectData);
      setProfiles(profileData);
      setAuth(authData);
    } catch (loadError) {
      setError(toUserErrorMessage(loadError, "Unable to load projects right now."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [projectType, status, owner]);

  const owners = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile.name])), [profiles]);

  const showTargetWeight = species !== "non-livestock";

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    setSubmitting(true);
    try {
      await apiClientJson("/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          species,
          breed,
          project_type: projectTypeValue,
          owner_id: ownerId ? Number(ownerId) : null,
          birth_date: birthDate || null,
          target_weight_lbs: showTargetWeight && targetWeightLbs ? Number(targetWeightLbs) : null,
          notes: notes || null
        })
      });
      toast.success("Project added!");
      setNewProjectOpen(false);
      setName("");
      setSpecies("");
      setBreed("");
      setProjectTypeValue("");
      setOwnerId("");
      setBirthDate("");
      setTargetWeightLbs("");
      setNotes("");
      await load();
    } catch {
      toast.error("Failed to add project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-4 font-serif text-2xl text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">Track livestock and non-livestock projects in one place.</p>
        </div>
        {auth?.role === "parent" && auth.is_unlocked ? (
          <Link className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium" href="/projects/new">
            Add Project
          </Link>
        ) : null}
      </div>

      <section className="rounded-2xl bg-card border border-border shadow-sm p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={projectType} onChange={(event) => setProjectType(event.target.value)} placeholder="Project type" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full" />
          <input value={status} onChange={(event) => setStatus(event.target.value)} placeholder="Status" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full" />
          <select value={owner} onChange={(event) => setOwner(event.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full">
            <option value="">Owner</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {loading ? <p className="text-sm text-muted-foreground">Loading projects...</p> : null}

      {error ? (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2 text-sm">
          <p className="text-destructive">{error}</p>
          <button type="button" onClick={() => load().catch(() => undefined)} className="bg-secondary text-foreground rounded-xl px-4 py-2 text-sm">
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !error && projects.length === 0 ? <p className="rounded-2xl bg-card border border-border shadow-sm px-4 py-3 text-sm text-muted-foreground">No projects found for the current filters.</p> : null}

      <div className="grid gap-3 md:grid-cols-2">
        {projects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`} className="rounded-2xl bg-card border border-border shadow-sm px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{project.name}</p>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{project.status}</span>
                </div>
                <p className="text-sm text-muted-foreground">Owner: {owners.get(project.owner_profile_id) ?? "Unknown"}</p>
                <p className="text-sm text-muted-foreground">{project.species || project.project_category || project.project_type}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {auth?.role === "parent" && auth.is_unlocked ? (
        <button
          onClick={() => setNewProjectOpen(true)}
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
        >
          <Plus size={26} />
        </button>
      ) : null}

      <Drawer.Root open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-card p-6 pb-10 shadow-xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
            <h2 className="mb-4 font-serif text-xl text-foreground">Add Project</h2>
            <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Project name</label>
                <input value={name} onChange={(event) => setName(event.target.value)} required className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Species</label>
                <CustomSelect fieldKey="species" builtInOptions={speciesOptions} value={species} onChange={setSpecies} placeholder="Select species" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Breed</label>
                <CustomSelect fieldKey="breed" builtInOptions={[]} value={breed} onChange={setBreed} placeholder="Select or add breed" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Project type</label>
                <CustomSelect fieldKey="project_type" builtInOptions={projectTypeOptions} value={projectTypeValue} onChange={setProjectTypeValue} placeholder="Select project type" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Owner</label>
                <select value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full">
                  <option value="">Select owner</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Birth date</label>
                <input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full" />
              </div>

              {showTargetWeight ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Target weight (lbs)</label>
                  <input type="number" value={targetWeightLbs} onChange={(event) => setTargetWeightLbs(event.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full" />
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Notes</label>
                <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full" />
              </div>

              <button type="submit" disabled={submitting} className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium w-full">
                Save project
              </button>
              <button type="button" onClick={() => setNewProjectOpen(false)} className="bg-secondary text-foreground rounded-xl px-4 py-2 text-sm w-full">
                Cancel
              </button>
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
