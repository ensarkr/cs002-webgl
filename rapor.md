# RAPOR


### veri kaynaklari
- `vertex kaynağı:` Harflerin vertexleri ve genişlikleri [alphabet stl dosyalarından](https://www.thingiverse.com/thing:15198) custom kodla çıkarıldı. Bu  veriler letterDatas adlı dosyada tutuluyor.
- `color kaynağı:` Renkler siyah arkaplanda görülebilcek şekilde rastgele oluşturuldu

### shaderlar

#### vertex shader 
``` 
  precision mediump float;

  attribute vec3 aVertexPosition;
  
  uniform mat4 uTransformationMatrix;
  uniform mat4 uViewProjectionMatrix;
  uniform vec4 uColor;

  varying vec4 color;

  void main(void) {
    gl_Position =  uViewProjectionMatrix * uTransformationMatrix * vec4(aVertexPosition.xyz, 1.0);
    color = uColor;
  }
```

#### fragment shader 
``` 
  precision mediump float;

  varying vec4 color;

  void main(void) {
    gl_FragColor = color;
  }
```

### matrixler

Matrixleri kullanmamızın en büyük nedenlerinden biri işlemleri matrixlerle önceden birleştirerek, vertex başına daha az işlem yapmakdır.

#### projectionMatrix 

Bu matrixin amacı primitivleri 2 boyutlu ekranda perspektif kullanarak 3 boyutluymuş gibi göstermekdir. 

``` 
  mat4.perspective(
    projectionMatrix, 
    FOV, // üst düzlem ile alt düzlem arasındaki açı 
    ASPECT_RATIO, // genişlik bölü uzunluk
    NEAR_PLANE, // görülebilecek en yakın z indexi
    FAR_PLANE // görülebilecek en uzak z indexi
  );
```
![projection matrix](https://i.sstatic.net/G4vP8.png)


#### viewMatrix 

Normalde webgl originden -z ye bakar. Bu matrixi kullanarak bakış kameramızın özelliklerlini değiştirebiliriz.  

``` 
  mat4.lookAt(
    viewMatrix,
    [CAMERA_X, CAMERA_Y, CAMERA_Z], // kamera pozisyonu
    [TARGET_X, TARGET_Y, TARGET_Z], // nereye bakıyoruz
    [0, 1, 0], // yukarı vektorü
  );
```
![view matrix](https://miro.medium.com/v2/resize:fit:1400/1*GMLVIbbWXGE291FTG10toQ.png)

#### transformationMatrix 

Amacı vertex poziyonlarını transform etmektir. 

``` 
  mat4.scale(
    transformationMatrix, 
    transformationMatrix, 
    [SCALE_X, SCALE_Y, SCALE_Z] // büyütme vektörü
  );

  mat4.rotateZ(
    transformationMatrix,
    transformationMatrix,
    ROTATION_RADIAN // döndürme radyanı
  );

  mat4.translate(
    transformationMatrix, 
    transformationMatrix, 
    [TRANSLATE_X, TRANSLATE_Y, TRANSLATE_Z] // translate vektörü
  );
```
İşlemlerin doğru sonuçlanabilmesi için çarpma sırasını istediğimizin tam tersi şekline yapmalıyız.

![transformation matrix](https://pub.mdpi-res.com/mathematics/mathematics-10-01859/article_deploy/html/images/mathematics-10-01859-g001.png?1654072237)

### render sistemi

#### shader aşaması

1. Shaderlar yaratılır.
2. Shaderlar compile edilir. 
3. Vertex ve fragment shaderları linklenip program oluşturulur.

#### buffer aşaması

1. Yeni buffer yaratılır.
2. ARRAY_BUFFER'ına bindlanır.  
3. ARRAY_BUFFER'ına vertexlerimiz yüklenir.  
4. vertexAttribPointer çağrılıp ARRAY_BUFFER'ımızdaki verilerin nasıl okunacağı yazılır.
5. enableVertexAttribArray çağrılıp attributemuz aktif edilir.

#### prerender aşaması

1. `projectionMatrix` yaratılır ve üzerine istenilen işlemler eklenir.
2. `viewMatrix` yaratılır ve üzerine istenilen işlemler eklenir.
3. `transformationMatrix` yaratılır ve üzerine istenilen işlemler eklenir.
4. `viewProjectionMatrix` yaratılır. Ve `transformationMatrix` ile `viewMatrix` çarpılıp `viewProjectionMatrix`e eşitlenir.
5. Matrixler uniform matrix değerlerine atanır.

#### vertex shader aşaması

Bu aşamada her bir verteximiz aynı aşamadan geçer.

1. Bufferdan shadera gelen vec3 posizyon vectörümüz matrix çarpması yapabilmek için vec4'e dönüştürülür.
2. Transformation matrixi ile çarpılır.
3. ViewProjection matrixi ile çarpılır.
4. Hesaplanan yeni pozisyon gl_Position adına eşitlenir.

#### fragment shader aşaması

Bu aşamada primitivlerin içinde bulunan her bir pixel aynı aşamadan geçer.

1. Vertexlerden gelen renkler ile gradient bir renk oluşturur.
2. Hesaplanan renk gl_FragColor adına eşitlenir.


### kaynaklar
- [MDN webgl](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial)
- [matrix transformations](https://www.youtube.com/watch?v=Cb4aoihvh-o&list=PLTd6ceoshprfZs1VIzGHDt-MYgVewC5tc&index=13)
- [webgl playlist](https://www.youtube.com/watch?v=y2UsQB3WSvo&list=PLjcVFFANLS5w6Qbj_1ziwT2LUHAwgZO2D&index=3)
- [perspective projection](https://www.youtube.com/watch?v=U0_ONQQ5ZNM)



