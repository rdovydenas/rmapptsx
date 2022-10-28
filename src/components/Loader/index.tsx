import React from "react";
import { View, ActivityIndicator } from "react-native";

const Loader = () => {
  return (
    <View style={{ position: "absolute", alignSelf: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
};

export default Loader;
