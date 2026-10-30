#!/usr/bin/env python3
"""Render UML class diagrams from the repository's Prisma schema.

All scalar attributes are drawn as private (-) by design convention. Prisma
does not encode UML visibility, so this script deliberately does not infer
public/protected visibility from the persistence schema.
"""
from __future__ import annotations

import html
import re
import subprocess
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "prisma" / "schema.prisma"
OUT = ROOT / "docs" / "uml"

DOMAINS = [
    ("Identité et engagement", "identite-engagement", [
        "Utilisateur", "Role", "UtilisateurRole", "PreferencesVisibiliteCitoyen",
        "Badge", "BadgeUtilisateur", "HistoriquePoints", "Notification",
    ], "#dbeafe"),
    ("Référentiels et équipes", "referentiels-equipes", [
        "TypeDechet", "Equipe", "AppartenanceEquipe", "CompetenceEquipe",
        "Region", "Departement", "Commune", "DelegationDecisionEquipe",
        "DisponibiliteEquipe", "HistoriqueDisponibiliteEquipe",
    ], "#dcfce7"),
    ("Signalements et qualification", "signalements-qualification", [
        "Signalement", "PhotoSignalement", "ContenuSignalement", "DemandeComplement",
        "ReponseComplement", "QualificationSignalement", "IdempotenceSignalement",
    ], "#fef3c7"),
    ("Dossiers et opérations", "dossiers-operations", [
        "DossierTraitement", "RattachementSignalement", "ContenuDossier",
        "ProvenanceContenuDossier", "Affectation", "Intervention",
        "PhotoIntervention", "VerificationResolution",
        "HistoriqueLocalisationDossier", "HistoriquePrioriteDossier",
    ], "#f3e8ff"),
    ("Traçabilité et diffusion", "tracabilite-diffusion", [
        "EvenementMetier", "PublicationFlux", "PhotoPublication",
    ], "#ffe4e6"),
]
COLORS = {name: (slug, color) for name, slug, _, color in DOMAINS}
SCALAR_TYPES = {
    "String", "Boolean", "DateTime", "Decimal", "Int", "Float",
    "BigInt", "Json", "Bytes",
}
MODEL_RE = re.compile(r"^model\s+([A-Za-z][A-Za-z0-9_]*)\s*\{([\s\S]*?)^\}", re.M)
FIELD_RE = re.compile(r"^\s{2}([A-Za-z][A-Za-z0-9_]*)\s+([A-Za-z][A-Za-z0-9_]*(?:\?|\[\])?)\s*(.*)$")
RELATION_RE = re.compile(r"@relation(?:\(\"([^\"]+)\"([^)]*)\)|\(([^)]*)\))")
ID_BLOCK_RE = re.compile(r"@@id\(\s*\[([^\]]+)\]")
UNIQUE_BLOCK_RE = re.compile(r"@@unique\(\s*\[([^\]]+)\]")

def names_in_brackets(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]

def parse_schema():
    source = SCHEMA.read_text(encoding="utf-8")
    blocks = list(MODEL_RE.finditer(source))
    if not blocks:
        raise SystemExit("No Prisma models found.")
    names = {m.group(1) for m in blocks}
    domain_of = {}
    for domain, _, models, _ in DOMAINS:
        for model in models:
            if model in domain_of:
                raise SystemExit(f"Model {model} appears in multiple domains.")
            domain_of[model] = domain
    if names != set(domain_of):
        missing = sorted(names - set(domain_of))
        unknown = sorted(set(domain_of) - names)
        raise SystemExit(f"Domain inventory mismatch. Missing={missing}; unknown={unknown}")

    models = {}
    raw_relations = []
    for match in blocks:
        name, body = match.group(1), match.group(2)
        attrs, pk, uq, fk = [], set(), set(), set()
        for line in body.splitlines():
            id_match = ID_BLOCK_RE.search(line)
            if id_match:
                pk.update(names_in_brackets(id_match.group(1)))
                continue
            unique_match = UNIQUE_BLOCK_RE.search(line)
            if unique_match:
                uq.update(names_in_brackets(unique_match.group(1)))
                continue
            field_match = FIELD_RE.match(line)
            if not field_match:
                continue
            field, raw_type, rest = field_match.groups()
            is_array = raw_type.endswith("[]")
            is_optional = raw_type.endswith("?")
            base_type = raw_type[:-2] if is_array else raw_type[:-1] if is_optional else raw_type
            if base_type in names:
                relation_match = RELATION_RE.search(rest)
                relation_name = ""
                relation_args = ""
                if relation_match:
                    relation_name = relation_match.group(1) or ""
                    relation_args = relation_match.group(2) or relation_match.group(3) or ""
                fields_match = re.search(r"fields:\s*\[([^\]]+)\]", relation_args)
                fk_fields = names_in_brackets(fields_match.group(1)) if fields_match else []
                fk.update(fk_fields)
                raw_relations.append({
                    "from": name, "field": field, "to": base_type,
                    "array": is_array, "optional": is_optional,
                    "relation": relation_name, "fk_fields": fk_fields,
                })
                continue
            if base_type not in SCALAR_TYPES:
                continue
            if "@id" in rest:
                pk.add(field)
            if "@unique" in rest:
                uq.add(field)
            native_uuid = "@db.Uuid" in rest
            type_label = "UUID" if native_uuid else base_type
            attrs.append({
                "field": field, "type": type_label,
                "optional": is_optional,
            })
        models[name] = {"attributes": attrs, "pk": pk, "uq": uq, "fk": fk}

    # Annotate FKs once all models and compound constraints are known.
    for name, info in models.items():
        for attr in info["attributes"]:
            attr["pk"] = attr["field"] in info["pk"]
            attr["fk"] = attr["field"] in info["fk"]
            attr["uq"] = attr["field"] in info["uq"]

    # Keep one direction per declared Prisma relation. Prefer the side that
    # carries the FK fields, because it gives the exact optional/unique side.
    rel_by_key = {}
    for relation in raw_relations:
        pair = tuple(sorted((relation["from"], relation["to"])))
        key = (pair, relation["relation"])
        previous = rel_by_key.get(key)
        if previous is None:
            rel_by_key[key] = relation
        elif relation["fk_fields"] and not previous["fk_fields"]:
            rel_by_key[key] = relation
        elif relation["array"] and not previous["array"] and not previous["fk_fields"]:
            rel_by_key[key] = relation

    relations = []
    for relation in rel_by_key.values():
        src, dst = relation["from"], relation["to"]
        if relation["fk_fields"]:
            info = models[src]
            is_unique_fk = set(relation["fk_fields"]).issubset(info["pk"] | info["uq"])
            near_src = "0..1" if is_unique_fk else "*"
            near_dst = "0..1" if relation["optional"] else "1"
        elif relation["array"]:
            near_src, near_dst = "1", "*"
        else:
            near_src, near_dst = "0..1", "0..1"
        relations.append({
            **relation, "near_src": near_src, "near_dst": near_dst,
        })
    return models, domain_of, relations

def escape_dot(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")

def html_label(model_name: str, attributes: list[dict], color: str, overview=False) -> str:
    rows = [
        f'<TR><TD BGCOLOR="{color}" ALIGN="CENTER"><FONT POINT-SIZE="12"><B>{html.escape(model_name)}</B></FONT></TD></TR>'
    ]
    if overview:
        pks = [a["field"] for a in attributes if a["pk"]]
        summary = "PK: " + (", ".join(pks) if pks else "composite / see schema")
        rows.append(f'<TR><TD ALIGN="LEFT"><FONT POINT-SIZE="9">{html.escape(summary)}</FONT></TD></TR>')
    else:
        for attr in attributes:
            markers = []
            if attr["pk"]:
                markers.append("PK")
            if attr["fk"]:
                markers.append("FK")
            if attr["uq"]:
                markers.append("UQ")
            suffix = f" [{','.join(markers)}]" if markers else ""
            nullable = "?" if attr["optional"] else ""
            line = f'- {attr["field"]} : {attr["type"]}{nullable}{suffix}'
            rows.append(f'<TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">{html.escape(line)}</FONT></TD></TR>')
    return '<<TABLE BORDER="1" COLOR="#64748b" CELLBORDER="0" CELLSPACING="0" CELLPADDING="5">' + "".join(rows) + '</TABLE>>'

def edge_dot(relation: dict, domain_of: dict) -> str:
    src, dst = relation["from"], relation["to"]
    label = relation["field"]
    if relation["relation"]:
        label = f'{relation["relation"]} / {label}'
    color = "#64748b" if domain_of[src] == domain_of[dst] else "#9a6bb7"
    return (
        f'"{src}" -> "{dst}" [dir=none, color="{color}", penwidth=1.1, '
        f'fontname="Arial", fontsize=8, label="{escape_dot(label)}", '
        f'taillabel="{relation["near_src"]}", headlabel="{relation["near_dst"]}", '
        f'labeldistance=1.4, labelangle=25];'
    )

def render_dot(dot_path: Path, png_path: Path):
    subprocess.run(
        ["dot", "-Tpng", "-Gdpi=180", str(dot_path), "-o", str(png_path)],
        check=True,
    )
    with png_path.open("rb") as png:
        if png.read(8) != b"\x89PNG\r\n\x1a\n":
            raise SystemExit(f"Invalid PNG generated: {png_path}")

def main():
    models, domain_of, relations = parse_schema()
    OUT.mkdir(parents=True, exist_ok=True)
    generated = []

    # System overview: all 38 classes and all declared associations. Attribute
    # details are deliberately moved to the domain sheets to keep this overview
    # readable at normal zoom.
    overview = [
        'digraph ISIEcoClasses {',
        'graph [rankdir=LR, splines=polyline, overlap=false, compound=true, nodesep=0.45, ranksep=1.0, pad=0.35, bgcolor="white", labelloc="t", label="ISI-Eco Report — Diagramme de classes UML (vue d’ensemble)", fontsize=22, fontname="Arial"];',
        'node [shape=plain, fontname="Arial"];',
        'edge [fontname="Arial", fontsize=8, color="#64748b"];',
    ]
    for domain, slug, class_names, color in DOMAINS:
        overview.append(f'subgraph "cluster_{slug}" {{')
        overview.append(f'label="{escape_dot(domain)}"; color="{color}"; style="rounded"; penwidth=1.5; fontname="Arial"; fontsize=14;')
        for name in class_names:
            overview.append(f'"{name}" [label={html_label(name, models[name]["attributes"], color, overview=True)}];')
        overview.append("}")
    overview.extend(edge_dot(r, domain_of) for r in relations)
    overview.append("}")
    overview_path = OUT / "diagramme-classes-systeme.dot"
    overview_path.write_text("\n".join(overview), encoding="utf-8")
    overview_png = OUT / "diagramme-classes-systeme.png"
    render_dot(overview_path, overview_png)
    generated.append(overview_png.name)

    # Domain sheets: all private attributes plus the associations contained in
    # that domain. Cross-domain relations remain visible in the system overview.
    for domain, slug, class_names, color in DOMAINS:
        lines = [
            f'digraph "UML_{slug}" {{',
            f'graph [rankdir=LR, splines=polyline, overlap=false, nodesep=0.5, ranksep=0.9, pad=0.35, bgcolor="white", labelloc="t", label="ISI-Eco Report — {escape_dot(domain)}", fontsize=22, fontname="Arial"];',
            'node [shape=plain, fontname="Arial"];',
            'edge [fontname="Arial", fontsize=9, color="#64748b"];',
        ]
        lines.append(f'subgraph "cluster_{slug}" {{ label="{escape_dot(domain)}"; color="{color}"; style="rounded"; penwidth=1.5;')
        for name in class_names:
            lines.append(f'"{name}" [label={html_label(name, models[name]["attributes"], color, overview=False)}];')
        lines.append("}")
        lines.extend(
            edge_dot(r, domain_of) for r in relations
            if domain_of[r["from"]] == domain and domain_of[r["to"]] == domain
        )
        lines.append("}")
        dot_path = OUT / f"diagramme-classes-{slug}.dot"
        png_path = OUT / f"diagramme-classes-{slug}.png"
        dot_path.write_text("\n".join(lines), encoding="utf-8")
        render_dot(dot_path, png_path)
        generated.append(png_path.name)

    if len(models) != 38:
        raise SystemExit(f"Expected 38 Prisma models, got {len(models)}")
    print(f"Rendered {len(models)} classes, {len(relations)} associations, {len(generated)} PNG files:")
    for name in generated:
        print(f" - docs/uml/{name}")

if __name__ == "__main__":
    main()
