import "node-libs-expo/globals";
import "fastestsmallesttextencoderdecoder";

import React, { useState, useEffect } from "react";
import { Appbar, Text, TextInput, Card, Title, List } from "react-native-paper";
import { BarCodeScanner } from "expo-barcode-scanner";
import { View, StyleSheet } from "react-native";

import decode from "./lib/verifier";

const CertificateView = ({ data }) => {
  const [text, setText] = useState(null);

  useEffect(() => {
    decode(data)
      .then((d) => setText(d))
      .catch((err) => setText(err.message));
  });

  if (!text) {
    return <Text>Please wait...</Text>;
  }

  return (
    <View style={{ flex: 1, margin: 5, padding: 5 }}>
      <Card>
        <Card.Content>
          <Title>Certificate Issuer</Title>
          <TextInput mode="flat" disabled={true} style={{ margin: 5 }}>
            {text.metadata.subject.countryName}
          </TextInput>
          <TextInput mode="flat" disabled={true} style={{ margin: 5 }}>
            {text.metadata.subject.commonName}
          </TextInput>
        </Card.Content>
      </Card>
      <Card style={{ marginTop: 10 }}>
        <Card.Content>
          <Title>Vaccination Certificate</Title>
          <TextInput mode="flat" disabled={true} style={{ margin: 5 }}>
            {text.data.nam.fn}
          </TextInput>
          <TextInput mode="flat" disabled={true} style={{ margin: 5 }}>
            {text.data.nam.gn}
          </TextInput>
          <TextInput mode="flat" disabled={true} style={{ margin: 5 }}>
            {text.data.dob}
          </TextInput>
          <TextInput mode="flat" disabled={true} style={{ margin: 5 }}>
            {text.data.v[0].ci}
          </TextInput>
        </Card.Content>
      </Card>
    </View>
  );
};

const DccVerifier = () => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    setData(data);
  };

  return (
    <View style={{ flex: 1 }}>
      <View>
        <Appbar.Header>
          <Appbar.Content title="Certificate Scanner" subtitle={"HISP-VN"} />
        </Appbar.Header>
      </View>
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        {scanned ? (
          <CertificateView data={data} style={StyleSheet.absoluteFillObject} />
        ) : (
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
        )}
      </View>
    </View>
  );
};

export default DccVerifier;
