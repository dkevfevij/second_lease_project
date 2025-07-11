import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/login.tsx"),                    // "/"
  route("login", "routes/login-alias.tsx"),           // "/login"
  route("dashboard", "routes/dashboard.tsx"),
  route("ajouter-camion", "routes/ajouter-camion.tsx"),
  route("AjouterMembre", "routes/AjouterMembre.tsx"),
  route("ListeUtilisateurs", "routes/ListeUtilisateurs.tsx"),
] satisfies RouteConfig;
