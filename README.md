# 🚨 Emergency Vehicle Dispatching System  
### *Design and Analysis of Algorithms (DAA) Project – 2025–26*  

> “When every second counts, our algorithm saves lives.”  

---

## 🧠 Overview  

The **Emergency Vehicle Dispatching System (EVDS)** is a full-stack application that manages and dispatches emergency vehicles — **Ambulance 🚑, Fire Truck 🚒, and Police 🚓** — based on their **availability** and **nearest location**.  

This project uses **Kruskal’s Algorithm** (implemented in **C++**) to construct a **Minimum Spanning Tree (MST)** of all connected zip codes. The MST ensures the dispatch network operates on **minimum total travel distance**, allowing emergency vehicles to reach destinations quickly and efficiently.  

---

## 🎯 Objectives  

- Apply **graph algorithms** (Kruskal’s MST) to optimize dispatch routes.  
- Build an **interactive visualization** of the emergency network.  
- Enable **real-time updates** of vehicle availability.  
- Demonstrate **algorithmic problem-solving (DAA concepts)** in a real-world scenario.  

---

## ⚙️ Tech Stack  

| Component | Technology |
|------------|-------------|
| **Frontend** | React + Tailwind CSS |
| **Backend API** | Node.js (Express.js) |
| **Algorithm Module** | C++ (Kruskal’s MST implementation) |
| **Database** | Firebase / Supabase |
| **Graph Visualization** | D3.js or vis.js |
| **Integration** | C++ executed via WebAssembly or Node bridge |

---

## 🧩 Algorithm Used – Kruskal’s Algorithm (C++)  

### 🔹 Concept  
Kruskal’s Algorithm is a **Greedy Algorithm** used to find the **Minimum Spanning Tree (MST)** in a connected, weighted graph.  
In this project:
- Each **zip code** = Node  
- Each **road between zip codes** = Edge with weight (distance)  
- The MST forms the **optimal dispatch network**, minimizing total travel distance.  

---

### 🧮 Pseudocode  

```cpp
#include <bits/stdc++.h>
using namespace std;

struct Edge {
    int src, dest, weight;
};

struct Subset {
    int parent, rank;
};

int find(vector<Subset> &subsets, int i) {
    if (subsets[i].parent != i)
        subsets[i].parent = find(subsets, subsets[i].parent);
    return subsets[i].parent;
}

void Union(vector<Subset> &subsets, int x, int y) {
    int xroot = find(subsets, x);
    int yroot = find(subsets, y);
    if (subsets[xroot].rank < subsets[yroot].rank)
        subsets[xroot].parent = yroot;
    else if (subsets[xroot].rank > subsets[yroot].rank)
        subsets[yroot].parent = xroot;
    else {
        subsets[yroot].parent = xroot;
        subsets[xroot].rank++;
    }
}

void KruskalMST(vector<Edge> &edges, int V) {
    vector<Edge> result;
    sort(edges.begin(), edges.end(), [](Edge a, Edge b) {
        return a.weight < b.weight;
    });

    vector<Subset> subsets(V);
    for (int v = 0; v < V; v++) {
        subsets[v].parent = v;
        subsets[v].rank = 0;
    }

    int e = 0, i = 0;
    while (e < V - 1 && i < edges.size()) {
        Edge next = edges[i++];
        int x = find(subsets, next.src);
        int y = find(subsets, next.dest);
        if (x != y) {
            result.push_back(next);
            Union(subsets, x, y);
            e++;
        }
    }

    cout << "Edges in the constructed MST:\n";
    for (auto &edge : result)
        cout << edge.src << " -- " << edge.dest << " == " << edge.weight << endl;
}
