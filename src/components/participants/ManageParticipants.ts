// import type AppState from "../../state/AppState";
// import type AppStore from "../../store";

// export default function renderManageParticipants(
//   _state: AppState,
//   store: AppStore
// ): string {
//   const currentUser = store.getCurrentUser();
//   const sharedExpenseId = store.getCurrentSharedExpenseId();
//   const sharedExpense = store.getSharedExpense(sharedExpenseId!);

//   if (!sharedExpense || !currentUser) {
//     return "<div>Error: No se encontró el gasto compartido</div>";
//   }

//   const isAdmin = sharedExpense.administrators.includes(currentUser.uid);

//   if (!isAdmin) {
//     return "<div>Solo los administradores pueden gestionar participantes</div>";
//   }

//   const participants = await store.getUsersByIds(sharedExpense.participants);

//   return `
//     <div class="space-y-4">
//       <header class="mb-6">
//         <button onclick="setView('dashboard')" class="text-blue-600">
//           ← Volver
//         </button>
//         <h1 class="text-2xl font-bold mt-2">Gestionar Participantes</h1>
//       </header>

//       <!-- Lista de participantes actuales -->
//       <div class="bg-white rounded-lg shadow p-4">
//         <h2 class="font-semibold mb-3">Participantes Actuales</h2>
//         <div class="space-y-2">
//           ${participants
//             .map(
//               (p) => `
//             <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
//               <div class="flex items-center gap-3">
//                 ${
//                   p.photoURL
//                     ? `
//                   <img src="${p.photoURL}" class="w-10 h-10 rounded-full" />
//                 `
//                     : `
//                   <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
//                     ${p.displayName.charAt(0).toUpperCase()}
//                   </div>
//                 `
//                 }
//                 <div>
//                   <p class="font-medium">${p.displayName}</p>
//                   <p class="text-sm text-gray-600">${p.email}</p>
//                 </div>
//               </div>
//               <div class="flex items-center gap-2">
//                 <span class="px-2 py-1 text-xs rounded ${
//                   sharedExpense.administrators.includes(p.uid)
//                     ? "bg-purple-100 text-purple-700"
//                     : "bg-gray-100 text-gray-700"
//                 }">
//                   ${
//                     sharedExpense.administrators.includes(p.uid)
//                       ? "Admin"
//                       : "Participante"
//                   }
//                 </span>
//               </div>
//             </div>
//           `
//             )
//             .join("")}
//         </div>
//       </div>

//       <!-- Agregar participante -->
//       <div class="bg-white rounded-lg shadow p-4">
//         <h2 class="font-semibold mb-3">Agregar Participante</h2>
        
//         <div class="flex gap-2 mb-4">
//           <button 
//             id="tab-email" 
//             class="flex-1 py-2 border-b-2 border-blue-600 text-blue-600 font-medium"
//           >
//             Por Email
//           </button>
//           <button 
//             id="tab-link" 
//             class="flex-1 py-2 border-b-2 border-gray-300 text-gray-600"
//           >
//             Por Link
//           </button>
//         </div>

//         <!-- Tab: Por Email -->
//         <div id="email-tab-content">
//           <form id="invite-by-email-form" class="space-y-3">
//             <input
//               type="email"
//               name="email"
//               required
//               class="w-full p-2 border rounded"
//               placeholder="email@ejemplo.com"
//             />
            
//             <label class="flex items-center gap-2">
//               <input type="checkbox" name="isAdmin" />
//               <span class="text-sm">Agregar como administrador</span>
//             </label>
            
//             <button 
//               type="submit" 
//               class="w-full bg-blue-600 text-white py-2 rounded"
//             >
//               Enviar Invitación
//             </button>
//           </form>
//         </div>

//         <!-- Tab: Por Link (oculto por defecto) -->
//         <div id="link-tab-content" class="hidden">
//           <button 
//             id="generate-link-btn" 
//             class="w-full bg-green-600 text-white py-2 rounded mb-4"
//           >
//             Generar Link de Invitación
//           </button>
          
//           <div id="generated-link" class="hidden">
//             <div class="bg-gray-50 p-3 rounded flex items-center gap-2">
//               <input 
//                 id="link-url" 
//                 type="text" 
//                 readonly 
//                 class="flex-1 bg-transparent"
//               />
//               <button 
//                 id="copy-link-btn" 
//                 class="px-3 py-1 bg-blue-600 text-white rounded text-sm"
//               >
//                 Copiar
//               </button>
//             </div>
//             <p class="text-xs text-gray-600 mt-2">
//               Comparte este link para invitar participantes
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   `;
// }
