import * as admin from 'firebase-admin';

export const addRestaurant = async (db: FirebaseFirestore.Firestore, auth: admin.auth.Auth, data: any) => {

        const batch = db.batch(); //criamos um batch para realizar as duas funções a nível atomico (so funiciona se as duas derem certo)
        const docRef = db.collection('Restaurant').doc(); //isto cria um ID pro restaurante que vamos criar
    
        const { uid } = await auth.createUser({
            uid: docRef.id,
            email: data.email,
            password: data.password,
            displayName: data.name
        }); // aqui criamos um auth user no firebase auth com os dados disponíveis no que foi passado pela requisição
    
        batch.set(docRef, {
            ...data,
            uid
        });
          
        // Cria um documento na coleção "menu" com o mesmo ID do restaurante
        const menuDocRef = db.collection('Menu').doc(docRef.id);
        batch.set(menuDocRef, {
            new: true
        });
          
        await batch.commit(); // aqui executamos as 3 ações: criamos o auth user ,restaurante no banco de dados e o menu do restaurante
        return uid
};

export const getRestaurant = async (db: FirebaseFirestore.Firestore, restaurantId: string) => {
  // Your code for retrieving restaurant details
};


