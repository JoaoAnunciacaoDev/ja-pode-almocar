export type DemoMember = { id: string; name: string; initials: string; role: "OWNER" | "MEMBER" };

export type DemoGroup = {
  id: string;
  name: string;
  institution: string;
  inviteCode: string;
  members: DemoMember[];
};

const initialGroups: DemoGroup[] = [
  {
    id: "republica-bloco-b",
    name: "República do Bloco B",
    institution: "Universidade Estadual de Feira de Santana",
    inviteCode: "7FX92A",
    members: [
      { id: "maria", name: "Maria Almeida", initials: "MA", role: "OWNER" },
      { id: "joao", name: "João Silva", initials: "JS", role: "MEMBER" },
      { id: "pedro", name: "Pedro Lima", initials: "PL", role: "MEMBER" },
      { id: "ana", name: "Ana Costa", initials: "AC", role: "MEMBER" },
    ],
  },
];

export function loadDemoGroups(): DemoGroup[] {
  try {
    const stored = localStorage.getItem("demo-groups");
    return stored ? (JSON.parse(stored) as DemoGroup[]) : initialGroups;
  } catch {
    return initialGroups;
  }
}

export function saveDemoGroups(groups: DemoGroup[]) {
  localStorage.setItem("demo-groups", JSON.stringify(groups));
}

export function createDemoGroup(name: string, institution: string): DemoGroup {
  const id = `${name.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
  const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();
  return {
    id,
    name,
    institution,
    inviteCode,
    members: [{ id: "maria", name: "Maria Almeida", initials: "MA", role: "OWNER" }],
  };
}
