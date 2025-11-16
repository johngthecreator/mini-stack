import Index from "@/app/pages/index";
import About from "@/app/pages/about";
import * as LoginApi from "@/app/api/login";
import * as SignupApi from "@/app/api/signup";
import * as HelloApi from "@/app/api/hello";
import Login from "@/app/pages/login";
import Signup from "@/app/pages/signup";
import type { BunRequest } from "bun";
import { authLoader } from "@/core/internal/utils";

export const routes = [
  {
    path: "/",
    view: Index,
    loader: await authLoader(async (req: BunRequest) => {
      return {};
    }),
  },
  {
    path: "/about",
    view: About,
  },
  {
    path: "/login",
    view: Login,
  },
  {
    path: "/signup",
    view: Signup,
  },
  {
    path: "/api/login",
    api: LoginApi.POST,
  },
  {
    path: "/api/signup",
    api: SignupApi.POST,
  },
  {
    path: "/api/hello",
    api: authLoader(HelloApi.GET),
  },
];
