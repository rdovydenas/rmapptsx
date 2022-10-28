import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { Home, Verification } from "./src/views";
import { UserContext } from "./src/context/user/userContext";

const Stack = createNativeStackNavigator();

const App = () => {
  const [value, setValue] = useState(false);
  return (
    <UserContext.Provider value={{ value, setValue }}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen
            name="Home"
            component={Home}
            options={{ title: "Welcome" }}
          />
          <Stack.Screen name="Verification" component={Verification} />
        </Stack.Navigator>
      </NavigationContainer>
    </UserContext.Provider>
  );
};

export default App;
