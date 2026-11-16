import axios from "axios";

const axiosClient = axios.create({
  baseURL: "http://localhost:8080/api",  // your Spring Boot backend
});

axiosClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("hms_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem("hms_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosClient;