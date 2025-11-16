import Index from "@/app/pages/index";
import About from "@/app/pages/about";
import * as LoginApi from "@/app/api/login";
import * as SignupApi from "@/app/api/signup";
import * as HelloApi from "@/app/api/hello";
import * as SignoutApi from "@/app/api/signout";
import Login from "@/app/pages/login";
import Signup from "@/app/pages/signup";
import type { BunRequest } from "bun";
import { authLoader, type Route } from "@/core/internal/utils";

export const routes: Route[] = [
  {
    path: "/",
    view: Index,
    loader: authLoader(async (req: BunRequest) => {
      return {};
    }),
  },
  {
    path: "/about",
    view: About,
    loader: authLoader(async (req: BunRequest) => {
      return { message: "This text is from a loader." };
    }),
  },
  {
    path: "/login",
    view: Login,
    loader: authLoader(async (req: BunRequest) => {
      return {};
    }),
  },
  {
    path: "/signup",
    view: Signup,
    loader: authLoader(async (req: BunRequest) => {
      return {};
    }),
  },
  {
    path: "/api/login",
    api: {
      POST: LoginApi.POST,
    },
  },
  {
    path: "/api/signup",
    api: {
      POST: SignupApi.POST,
    },
  },
  {
    path: "/api/signout",
    api: {
      POST: SignoutApi.POST,
    },
  },
  {
    path: "/api/hello",
    api: {
      GET: authLoader(HelloApi.GET),
    },
  },
];
