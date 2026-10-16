import React from "react";
import ContractTableFilter, {
  Contract,
} from "../components/ContractTableFilter";

const CONTRACTS: Contract[] = [
  {
    id: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    name: "Payments Hub",
    network: "Testnet",
    status: "active",
    registeredAt: "2026-01-15",
  },
  {
    id: "CA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ",
    name: "Token Vault",
    network: "Mainnet",
    status: "paused",
    registeredAt: "2026-02-10",
  },
  {
    id: "GAREELRO7U2S4ZS3GMKZHXHCCYMOXNCSXYQ4KKRMT47TGXCTDYYEO7YX",
    name: "Oracle Feed",
    network: "Testnet",
    status: "unverified",
    registeredAt: "2026-03-01",
  },
  {
    id: "CBQJK6E7K3H4Y5ZQW7XN2M8VLT9FJPGDA4RBC3ST5HGE2QJ4YN6KFF7A",
    name: "NFT Marketplace",
    network: "Testnet",
    status: "active",
    registeredAt: "2026-04-22",
  },
  {
    id: "CCUF4YVLQQGHVCJX4RWMXQJHFK6Y2ZP7XT5BNHT6SU7J2P3IGOUOGK5P",
    name: "Governance DAO",
    network: "Mainnet",
    status: "active",
    registeredAt: "2026-05-30",
  },
];

const ContractsPage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Contracts
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Browse registered contracts and filter the table by name, ID,
            network, or status.
          </p>
        </div>
      </div>

      <ContractTableFilter contracts={CONTRACTS} />
    </div>
  );
};

export default ContractsPage;
