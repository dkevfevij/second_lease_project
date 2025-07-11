import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"), // Page de connexion "/"
  route("dashboard", "routes/dashboard.tsx"), // Dashboard "/dashboard"
  route("ajouter-camion", "routes/ajouter-camion.tsx"), // Ajout/modification/suppression
  route("AjouterMembre", "routes/AjouterMembre.tsx"), // Ajout membre
  route("ListeUtilisateurs", "routes/ListeUtilisateurs.tsx"), // Ajout membre
] satisfies RouteConfig;
