import Index from "@/app/pages/index";
import About from "@/app/pages/about";
import Login from "@/app/pages/login";
import Signup from "@/app/pages/signup";

export const routes = [
  { path: "/", view: Index },
  { path: "/about", view: About },
  { path: "/login", view: Login },
  { path: "/signup", view: Signup },
];
