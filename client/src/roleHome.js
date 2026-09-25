export const roleHome = (role) => {
  if (role === "admin" || role === "editor") return "/admin";
  if (role === "trainer") return "/trainer";
  if (role === "finance") return "/finance";
  return "/dashboard";
};

export const roleLabel = (role) => {
  if (role === "admin") return "Admin";
  if (role === "editor") return "Editor";
  if (role === "trainer") return "Trainer";
  if (role === "finance") return "Finance";
  return "Dashboard";
};
