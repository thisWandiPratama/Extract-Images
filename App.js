import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Button,
  FlatList,
  TouchableOpacity,
  ToastAndroid,
  ScrollView,
  Modal,
  PermissionsAndroid,
  ActivityIndicator,
  Alert
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import RNFS, { exists } from 'react-native-fs'; // Import react-native-fs library
import RNFetchBlob from "rn-fetch-blob";

const App = () => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingExtract, setIsLoadingExtract] = useState(false)

  useEffect(() => {
    checkPermissions()
  }, [])

  const checkPermissions = async () => {
    try {
      const grantedRead = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Permission',
          message:
            'Cool Photo App needs access to your READ_EXTERNAL_STORAGE ' +
            'so you can take awesome pictures.',
          buttonPositive: 'OK',
        }
      );

      const grantedWrite = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Permission',
          message:
            'Cool Photo App needs access to your WRITE_EXTERNAL_STORAGE ' +
            'so you can take awesome pictures.',
          buttonPositive: 'OK',
        }
      );
      console.log(grantedWrite)
      if (
        grantedRead === PermissionsAndroid.RESULTS.GRANTED &&
        grantedWrite === PermissionsAndroid.RESULTS.GRANTED
      ) {
        console.log('You can use READ_EXTERNAL_STORAGE and WRITE_EXTERNAL_STORAGE');
      } else {
        console.log('READ_EXTERNAL_STORAGE or WRITE_EXTERNAL_STORAGE permission denied');
      }
    } catch (err) {
      console.warn(err);
    }
  };


  const selectImage = () => {
    setIsLoading(true)
    const options = {
      title: 'Pilih Foto',
      mediaType: 'photo',
      quality: 1,
      selectionLimit: 30,
      storageOptions: {
        skipBackup: true,
      },
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        setIsLoading(false)
        console.log('Pengguna membatalkan pemilihan gambar');
      } else if (response.error) {
        setIsLoading(false)
        console.log('Error:', response.error);
      } else {
        let lengthImages = Object.keys(response.assets).length

        let totalImages = []

        for (let index = 0; index < lengthImages; index++) {
          const newImage = {
            uri: response.assets[index].uri,
          };
          totalImages.push(newImage)
        }

        if (lengthImages == totalImages.length) {
          setSelectedImages([...selectedImages, ...totalImages]);
          setIsLoading(false)
        } else {
          ToastAndroid.show("Terjadi Kesalahan, Silakan Ulangi!")
          setIsLoading(false)
        }
      }
    });
  };

  const openModal = (image) => {
    setSelectedImage(image);
    setModalVisible(true);
  };

  const extractImages = () => {
    setIsLoadingExtract(true)
    const imageData = selectedImages.map((item, index) => ({
      index: index,
      id: String(selectedImages.length - index), // Urutan besar ke kecil
      width: 800,
      height: 1600,
    }));

    const jsonData = {
      imageInfo: imageData,
    };

    // Get current date and time
    const now = new Date();
    const timestamp =
      now.getFullYear() +
      '_' +
      (now.getMonth() + 1) +
      '_' +
      now.getDate() +
      '_' +
      now.getHours() +
      '_' +
      now.getMinutes() +
      '_' +
      now.getSeconds()

    const fileName = `extract_images_${timestamp}.json`;
    const folderPath = `${RNFS.DocumentDirectoryPath}/Extract-Images`;

    // // Check if the folder exists, if not, create it
    RNFS.exists(folderPath)
      .then((exists) => {
        if (!exists) {
          return RNFS.mkdir(folderPath);
        }
        return Promise.resolve(true);
      })
      .then(() => {
        // Write JSON data to the file
        const filePath = `${folderPath}/${fileName}`;
        return RNFS.writeFile(filePath, JSON.stringify(jsonData), 'utf8');
      })
      .then(() => {
        let resultFolder = RNFS.DocumentDirectoryPath
        let localFilePath = `${resultFolder}/Extract-Images/${fileName}`
        fetch('file://' + localFilePath)
          .then((data) => {
            const folderName = "Extract-Images"
            const downloadDir = RNFetchBlob.fs.dirs.DownloadDir
            const newFolderPath = `${downloadDir}/${folderName}`

            // Simpan isi berkas ke folder "Download"
            const downloadDest = `${newFolderPath}/${fileName}`;

            RNFetchBlob.fs.exists(newFolderPath)
              .then((exists) => {
                if (exists) {
                  saveFinal(downloadDest, data, fileName)
                } else {
                  RNFetchBlob.fs.mkdir(newFolderPath)
                    .then(() => {
                      saveFinal(downloadDest, data, fileName)
                    })
                    .catch((error) => {
                      ToastAndroid.show('Gagal membuat folder', ToastAndroid.SHORT);
                      setIsLoadingExtract(false)
                    });
                }
              })


          })
          .catch((error) => {
            ToastAndroid.show('Gagal membaca berkas', ToastAndroid.SHORT);
            setIsLoadingExtract(false)
          });
      })
      .catch((error) => {
        console.log(error)
        ToastAndroid.show('Gagal menyimpan data JSON', ToastAndroid.SHORT);
        setIsLoadingExtract(false)
      });
  };

  const saveFinal = (downloadDest, data, fileName) => {
    // Mengonversi respons HTTP menjadi teks JSON
    data.text()
      .then((dataString) => {
        // Simpan data JSON ke berkas
        RNFetchBlob.fs
          .writeFile(downloadDest, dataString, 'utf8')
          .then(() => {
            setIsLoadingExtract(false)
            ToastAndroid.show('Berkas berhasil disimpan di Folder Download/Extract-Images ', ToastAndroid.SHORT);
            Alert.alert("Berkas berhasil disimpan", `Lokasi File di Folder Download/Extract-Images/${fileName}`)
          })
          .catch((error) => {
            console.log(error)
            ToastAndroid.show('Gagal menyimpan berkas', ToastAndroid.SHORT);
            setIsLoadingExtract(false)
          });
      })
      .catch((error) => {
        console.log(error);
        ToastAndroid.show('Gagal membaca berkas', ToastAndroid.SHORT);
        setIsLoadingExtract(false)
      });
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingLeft: 20, marginTop: 30 }}>
        <Text style={{ fontSize: 30, fontWeight: "bold", color: "#000" }}>Extract <Text style={{ color: "#4AC68A" }}>Images</Text></Text>
        <Text style={{ color: "rgba(0,0,0,0.5)", fontSize: 12 }}>Upload semua gambar disini</Text>
      </View>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ width: "100%", height: "60%", padding: 10, flex: 1, flexDirection: "row", flexWrap: "wrap", justifyContent: selectedImages.length == 0 ? "flex-start" : "space-evenly" }}>
          {isLoading ?
            <View style={{ position: "absolute", alignSelf: "center", backgroundColor: "transparent", width: "100%", height: "60%", }}>
              <ActivityIndicator color={"#4AC68A"} size={"large"} />
            </View>
            :
            null
          }
          <TouchableOpacity onPress={() => selectImage()} >
            <Image source={require("./src/assets/add-image.png")} style={{ height: 100, width: 100, margin: 5 }} />
          </TouchableOpacity>
          {
            selectedImages.map((item, index) => {
              return (
                <TouchableOpacity key={index} onPress={() => openModal(item)} style={{ margin: 5, borderWidth: 1, borderColor: "#aeaeae", width: 100, height: 100, }}>
                  <Image
                    source={{ uri: item.uri }}
                    style={{ width: 100, height: 100, resizeMode: "center" }}
                  />
                </TouchableOpacity>
              )
            })
          }
        </View >
      </ScrollView>
      <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: "#aeaeae", marginTop: 20 }}>
        <View style={{ flexDirection: "row", width: "100%", height: 80, marginTop: 30, justifyContent: "space-around" }}>
          <TouchableOpacity onPress={() => setSelectedImages([])} style={{ height: 60, width: 200, backgroundColor: "#769586", alignItems: "center", justifyContent: "center", borderRadius: 40 }} >
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 20 }}>Cancel Extract</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => extractImages()} style={{ backgroundColor: selectedImages.length == 0 ? "#aeaeae" : "#0C5331", width: 200, height: 60, alignItems: "center", justifyContent: "center", borderRadius: 40 }} disabled={selectedImages.length == 0 ? true : false}>
            {
              isLoadingExtract ?
                <ActivityIndicator color={"#fff"} size={"large"} />
                :
                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 20 }}>Extract Images</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
      <Modal visible={modalVisible} transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
          <TouchableOpacity onPress={() => setModalVisible(false)}>
            <Image
              source={{ uri: selectedImage?.uri }}
              style={{ width: 300, height: 300, resizeMode: 'contain' }}
            />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
export default App