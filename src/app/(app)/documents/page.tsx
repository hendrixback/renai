import { permanentRedirect } from "next/navigation";

// The spec (§15) calls this module "Documentation", and the new
// implementation lives at /documentation. This legacy path survives as a
// permanent redirect so bookmarks/links keep working.
export default function DocumentsRedirect() {
  permanentRedirect("/documentation");
}
