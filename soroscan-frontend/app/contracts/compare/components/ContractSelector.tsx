import * as React from "react";
import type { Contract } from "@/components/ingest/contract-types";

interface ContractSelectorProps {
  contracts: Contract[];
  selectedContract: Contract | null;
  onSelect: (contract: Contract) => void;
  disabled?: boolean;
}

export function ContractSelector({
  contracts,
  selectedContract,
  onSelect,
  disabled = false,
}: ContractSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredContracts = contracts.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-green-400/50 bg-black text-left text-green-400 ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-green-400"
        }`}
      >
        {selectedContract ? (
          <div>
            <div className="font-bold">{selectedContract.name}</div>
            <div className="text-xs text-green-400/70">{selectedContract.id}</div>
          </div>
        ) : (
          <span className="text-green-400/50">Select a contract...</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-green-400/50 z-50">
          <input
            type="text"
            placeholder="Search contracts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-black text-green-400 border-b border-green-400/30 focus:outline-none text-sm"
            autoFocus
          />

          <div className="max-h-48 overflow-y-auto">
            {filteredContracts.length === 0 ? (
              <div className="px-3 py-2 text-green-400/50 text-sm">No contracts found</div>
            ) : (
              filteredContracts.map((contract) => (
                <button
                  key={contract.id}
                  onClick={() => {
                    onSelect(contract);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-green-400/10 border-b border-green-400/20 ${
                    selectedContract?.id === contract.id
                      ? "bg-green-400/20 text-green-300"
                      : "text-green-400"
                  }`}
                >
                  <div className="font-bold text-sm">{contract.name}</div>
                  <div className="text-xs text-green-400/60">{contract.id}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
