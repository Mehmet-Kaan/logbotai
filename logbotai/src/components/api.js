import axios from "axios";
import { auth } from "./firebase.js";

const configuredBaseURL = process.env.REACT_APP_API_BASE_URL || "/api";

const apiClient = axios.create({
  baseURL: configuredBaseURL.replace(/\/$/, ""),
  timeout: 55000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
