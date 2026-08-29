/**
 * Convert the hand-written JSON Schemas in schema-json.ts into the shape the
 * Gemini `responseSchema` accepts: nullability is a `nullable: true` flag rather
 * than a `["type","null"]` union or an `anyOf` with a null branch, and
 * `additionalProperties` is dropped.
 */

type AnyObj = Record<string, unknown>;

function isNullBranch(s: unknown): boolean {
  return !!s && typeof s === "object" && (s as AnyObj).type === "null";
}

export function geminify(schema: unknown): AnyObj {
  if (!schema || typeof schema !== "object") return schema as AnyObj;
  const s = { ...(schema as AnyObj) };
  delete s.additionalProperties;

  // anyOf: [X, {type:"null"}]  ->  geminify(X) + nullable
  if (Array.isArray(s.anyOf)) {
    const branches = s.anyOf as unknown[];
    const nonNull = branches.filter((b) => !isNullBranch(b));
    const hadNull = nonNull.length !== branches.length;
    if (nonNull.length === 1) {
      const out = geminify(nonNull[0]);
      if (hadNull) out.nullable = true;
      if (s.description && !out.description) out.description = s.description;
      return out;
    }
    s.anyOf = nonNull.map(geminify);
    if (hadNull) s.nullable = true;
  }

  // type: ["string","null"] -> type:"string", nullable:true
  if (Array.isArray(s.type)) {
    const types = s.type as string[];
    const real = types.filter((t) => t !== "null");
    s.type = real[0];
    if (types.includes("null")) s.nullable = true;
  }

  if (s.properties && typeof s.properties === "object") {
    const props: AnyObj = {};
    for (const [k, v] of Object.entries(s.properties as AnyObj)) props[k] = geminify(v);
    s.properties = props;
  }
  if (s.items) s.items = geminify(s.items);

  return s;
}
