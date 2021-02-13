pragma solidity ^0.8.0;

contract CurveRegistry {
    struct CurveOptions {
        address libraryAddr;
        string name;
        bool active;
        address paramRegistry;
    }
}