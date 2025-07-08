import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/login.tsx"), // ceci correspond à "/"
  route("dashboard", "routes/dashboard.tsx"), // ceci correspond à "/dashboard"
] satisfies RouteConfig;
