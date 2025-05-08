import axios from "axios";

export const login = (email, password) => async (dispatch) => {
  try {
    const { data } = await axios.post("/api/auth/login", { email, password });

    console.log("Login Response:", data); // Debug log to verify backend response

    dispatch({
      type: "LOGIN_SUCCESS",
      payload: data, // Ensure user data is included
    });
  } catch (error) {
    console.error("Login error:", error.response?.data?.message || error.message);
  }
};
