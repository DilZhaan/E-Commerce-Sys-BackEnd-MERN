const initialState = {
  isAuthenticated: false,
  user: null,
};

export default function authReducer(state = initialState, action) {
  switch (action.type) {
    case "LOGIN_SUCCESS":
      console.log("LOGIN_SUCCESS Action Payload:", action.payload); // Debug log
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user, // Ensure user is set correctly
      };
    case "LOGOUT":
      return {
        ...state,
        isAuthenticated: false,
        user: null,
      };
    default:
      return state;
  }
}
