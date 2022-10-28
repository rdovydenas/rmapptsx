import React, { useState, useContext } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";

import { Loader } from "../../components";
import { UserContext } from "../../context/user/userContext";

const Home = ({ navigation }) => {
  const [startedVerification, setStartedVerification] = useState(false);
  const isVerified = useContext(UserContext);

  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      {!isVerified.value && (
        <View>
          <Text style={{ textAlign: "center", fontSize: 36, marginBottom: 24 }}>
            Verify your identity
          </Text>
          <Text
            style={{ textAlign: "center", fontSize: 18, marginBottom: 300 }}
          >
            It usually takes up to a minute.
          </Text>
          <TouchableOpacity
            onPress={() => {
              setStartedVerification(true);
              setTimeout(() => {
                navigation.navigate("Verification");
              }, 1000);
            }}
            style={{
              alignSelf: "center",
            }}
          >
            <Text style={{ textAlign: "center", color: "green", fontSize: 25 }}>
              Start verification
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {isVerified.value && (
        <View style={{ alignSelf: "center" }}>
          <Text
            style={{
              width: 300,
              fontSize: 40,
              textAlign: "center",
            }}
          >
            Congratulations! You're verified.
          </Text>
        </View>
      )}

      {startedVerification && !isVerified.value && <Loader />}
    </View>
  );
};

export default Home;
