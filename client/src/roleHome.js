export const roleHome = (role) => {
  if (role === "admin") return "/admin";
  if (role === "trainer") return "/trainer";
  if (role === "finance") return "/finance";
  if (role === "secretary") return "/secretary";
  return "/dashboard";
};

export const roleLabel = (role) => {
  if (role === "admin") return "Admin";
  if (role === "editor") return "Editor";
  if (role === "trainer") return "Trainer";
  if (role === "finance") return "Finance";
  if (role === "secretary") return "Secretary";
  return "Dashboard";
};
